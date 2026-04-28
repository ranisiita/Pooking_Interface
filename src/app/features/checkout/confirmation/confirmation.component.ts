import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { EstadoPipe } from '../../../shared/pipes/estado.pipe';
import { CheckoutStore } from '../../../state/checkout.store';
import { FacturasService, BoletosService, EquipajeService } from '../../../core/services/vuelos-api.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Equipaje, TipoEquipaje } from '../../../core/models/domain.models';
import { calcularIva, calcularTotal } from '../../../core/utils/money.util';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NavbarComponent, MoneyPipe, EstadoPipe],
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.css'],
})
export class ConfirmationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private checkoutStore = inject(CheckoutStore);
  private facturasService = inject(FacturasService);
  private boletosService = inject(BoletosService);
  private equipajeService = inject(EquipajeService);
  private toast = inject(ToastService);

  readonly state = this.checkoutStore.state;
  equipajes = signal<Equipaje[]>([]);
  emitiendo = signal(false);
  documentosEmitidos = signal(false);
  agregandoEquipaje = signal(false);

  equipajeForm = this.fb.group({
    tipo:               ['MANO' as TipoEquipaje, Validators.required],
    peso_kg:            [10, [Validators.required, Validators.min(0.1), Validators.max(50)]],
    descripcion:        [''],
    precio_extra:       [0],
    dimensiones_cm:     [''],
  });

  tiposEquipaje: TipoEquipaje[] = ['MANO', 'BODEGA'];

  ngOnInit(): void {
    const s = this.state();
    if (!s.reserva) {
      this.toast.show('No hay reserva activa.', 'error');
      this.router.navigate(['/']);
      return;
    }

    if (!s.factura || !s.boleto) {
      this.emitirDocumentos();
    } else {
      this.documentosEmitidos.set(true);
      if (s.boleto) this.cargarEquipajes(s.boleto.id_boleto);
    }
  }

  emitirDocumentos(): void {
    const s = this.state();
    if (!s.reserva || !s.cliente) return;

    this.emitiendo.set(true);
    const subtotal = s.vuelo?.precio_base ?? s.reserva.subtotal_reserva;
    const iva = calcularIva(subtotal);
    const total = calcularTotal(subtotal);

    this.facturasService.create({
      id_cliente:      s.cliente.id_cliente,
      id_reserva:      s.reserva.id_reserva,
      id_metodo:       1,
      subtotal,
      valor_iva:       iva,
      cargo_servicio:  0,
      total,
    }).pipe(
      switchMap((fRes) => {
        this.checkoutStore.setFactura(fRes.data);
        return this.boletosService.create({
          id_reserva:        s.reserva!.id_reserva,
          id_vuelo:          s.vuelo?.id_vuelo ?? s.reserva!.id_vuelo,
          id_asiento:        s.asiento?.id_asiento ?? s.reserva!.id_asiento,
          id_factura:        fRes.data.id_factura,
          clase:             s.asiento?.clase ?? 'ECONOMICA',
          precio_vuelo_base: s.vuelo?.precio_base ?? s.reserva!.subtotal_reserva,
          precio_asiento_extra: s.asiento?.precio_extra ?? 0,
          impuestos_boleto:  iva,
          precio_final:      total,
        });
      }),
    ).subscribe({
      next: (bRes) => {
        this.checkoutStore.setBoleto(bRes.data);
        this.emitiendo.set(false);
        this.documentosEmitidos.set(true);
        this.toast.show('Factura y boleto emitidos correctamente.', 'success');
        this.cargarEquipajes(bRes.data.id_boleto);
      },
      error: () => { this.emitiendo.set(false); },
    });
  }

  cargarEquipajes(idBoleto: number): void {
    this.equipajeService.list(idBoleto).subscribe({
      next: (res) => this.equipajes.set(res.data ?? []),
    });
  }

  agregarEquipaje(): void {
    if (this.equipajeForm.invalid) { this.equipajeForm.markAllAsTouched(); return; }

    const f = this.equipajeForm.value;
    if (f.tipo === 'MANO' && (f.peso_kg ?? 0) > 10) {
      this.toast.show('El equipaje de mano no puede superar los 10 kg.', 'error');
      return;
    }

    const idBoleto = this.state().boleto?.id_boleto;
    if (!idBoleto) return;

    this.agregandoEquipaje.set(true);
    this.equipajeService.create(idBoleto, {
      id_boleto:          idBoleto,
      tipo:               f.tipo as TipoEquipaje,
      peso_kg:            f.peso_kg ?? 0,
      descripcion_equipaje: f.descripcion || undefined,
      precio_extra:       f.precio_extra ?? 0,
      dimensiones_cm:     f.dimensiones_cm || undefined,
    }).subscribe({
      next: (res) => {
        this.equipajes.update((list) => [...list, res.data]);
        this.equipajeForm.reset({ tipo: 'MANO', peso_kg: 10, descripcion: '', precio_extra: 0, dimensiones_cm: '' });
        this.agregandoEquipaje.set(false);
        this.toast.show('Equipaje registrado correctamente.', 'success');
      },
      error: () => { this.agregandoEquipaje.set(false); },
    });
  }

  nueva(): void {
    this.checkoutStore.reset();
    this.router.navigate(['/']);
  }

  descargarBoleto(): void {
    const b = this.state().boleto;
    if (!b) return;
    const content = `BOLETO DE VIAJE\n================\nCódigo: ${b.codigo_boleto}\nClase: ${b.clase}\nPrecio: $${b.precio_final}\nEstado: ${b.estado_boleto}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `boleto_${b.codigo_boleto}.txt`;
    a.click();
  }
}
