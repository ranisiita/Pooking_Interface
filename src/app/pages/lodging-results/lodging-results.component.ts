import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/navbar/footer.component';
import { DatePickerComponent } from '../../components/date-picker/date-picker.component';
import { Lodging, LodgingService } from '../../services/lodging.service';

@Component({
  selector: 'app-lodging-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, FooterComponent, DatePickerComponent],
  templateUrl: './lodging-results.component.html',
  styleUrls: ['./lodging-results.component.css']
})
export class LodgingResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lodgingService = inject(LodgingService);
  private cdr = inject(ChangeDetectorRef);

  // Criterios de búsqueda activos
  busqueda = {
    destino: '',
    llegada: '',
    salida: '',
    habitaciones: 1,
    adultos: 2,
    ninos: 0
  };

  // Fecha de hoy para validaciones
  fechaHoy = '';

  // Errores de validación del formulario de búsqueda en resultados
  busquedaErrors = {
    destino: '',
    llegada: '',
    salida: '',
    habitaciones: '',
    adultos: '',
    ninos: ''
  };

  // Base de datos de alojamientos
  lodgings: Lodging[] = [];

  // Listado final que se muestra al usuario (filtrado y ordenado)
  filteredLodgings: Lodging[] = [];

  // Paginación funcional
  currentPage: number = 1;
  itemsPerPage: number = 3;

  get totalPages(): number {
    return Math.ceil(this.filteredLodgings.length / this.itemsPerPage) || 1;
  }

  get paginatedLodgings(): Lodging[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredLodgings.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get pagesArray(): number[] {
    const arr = [];
    for (let i = 1; i <= this.totalPages; i++) {
      arr.push(i);
    }
    return arr;
  }

  // Variables de filtros en el Sidebar
  filtroPrecioMin: number = 0;
  filtroPrecioMax: number = 300;
  sliderPrecioMax: number = 300; // Mantenido por compatibilidad

  filtroEstrellas: { [key: number]: boolean } = {
    5: false,
    4: false,
    3: false,
    2: false,
    1: false
  };

  filtroTipos: { [key: string]: boolean } = {
    'Hotel': false,
    'Hostal': false,
    'Motel': false,
    'Apartamento': false
  };



  filtroNinos: boolean = false;
  filtroMascotas: boolean = false;

  // Filtros activos formateados para los Tags superiores
  activeTags: { label: string; type: string; value: any }[] = [];

  // Opción de ordenación
  sortOption: string = 'recomendados';

  ngOnInit(): void {
    // Calcular fecha de hoy
    const hoy = new Date();
    this.fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    this.route.queryParams.subscribe(params => {
      console.log('[DEBUG] Query parameters received from URL:', params);
      this.busqueda.destino = params['destino'] || '';
      this.busqueda.llegada = params['llegada'] || '';
      this.busqueda.salida = params['salida'] || '';
      this.busqueda.habitaciones = params['habitaciones'] ? +params['habitaciones'] : 1;
      this.busqueda.adultos = params['adultos'] ? +params['adultos'] : 2;
      this.busqueda.ninos = params['ninos'] ? +params['ninos'] : 0;

      // Si vienen del buscador con filtros iniciales
      if (this.busqueda.ninos > 0) {
        this.filtroNinos = true;
      }

      console.log('[DEBUG] Calling buscarLodgings with criteria:', {
        destino: this.busqueda.destino,
        fechaInicio: this.busqueda.llegada,
        fechaFin: this.busqueda.salida,
        adultos: this.busqueda.adultos,
        ninos: this.busqueda.ninos,
        habitaciones: this.busqueda.habitaciones
      });

      this.lodgingService.buscarLodgings({
        destino: this.busqueda.destino,
        fechaInicio: this.busqueda.llegada,
        fechaFin: this.busqueda.salida,
        adultos: this.busqueda.adultos,
        ninos: this.busqueda.ninos,
        habitaciones: this.busqueda.habitaciones
      }).subscribe({
        next: (lodgings) => {
          console.log('[DEBUG] buscarLodgings returned raw result count:', lodgings.length, lodgings);
          this.lodgings = lodgings;
          this.aplicarFiltros();
          console.log('[DEBUG] filteredLodgings visible after client-side filters:', this.filteredLodgings.length, this.filteredLodgings);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[ERROR] buscarLodgings API request failed:', err);
          this.cdr.detectChanges();
        }
      });
    });
  }

  validarBusqueda(campo: keyof typeof this.busquedaErrors): void {
    const hoyStr = this.fechaHoy;

    if (campo === 'destino') {
      this.busquedaErrors.destino = (!this.busqueda.destino || !this.busqueda.destino.trim())
        ? 'Por favor, ingresa un destino.'
        : '';
    }

    if (campo === 'llegada') {
      const lleg = this.busqueda.llegada;
      if (!lleg) {
        this.busquedaErrors.llegada = 'Selecciona una fecha de llegada.';
      } else if (lleg < hoyStr) {
        this.busquedaErrors.llegada = 'La fecha no puede ser anterior a hoy.';
      } else {
        this.busquedaErrors.llegada = '';
        if (this.busqueda.salida && this.busqueda.salida < lleg) {
          this.busquedaErrors.salida = 'La salida no puede ser antes de la llegada.';
        } else if (this.busqueda.salida && this.busqueda.salida >= lleg &&
                   this.busquedaErrors.salida === 'La salida no puede ser antes de la llegada.') {
          this.busquedaErrors.salida = '';
        }
      }
    }

    if (campo === 'salida') {
      const sal = this.busqueda.salida;
      const lleg = this.busqueda.llegada;
      if (!sal) {
        this.busquedaErrors.salida = 'Selecciona una fecha de salida.';
      } else if (sal < hoyStr) {
        this.busquedaErrors.salida = 'La fecha no puede ser anterior a hoy.';
      } else if (lleg && sal < lleg) {
        this.busquedaErrors.salida = 'La salida no puede ser antes de la llegada.';
      } else {
        this.busquedaErrors.salida = '';
      }
    }

    if (campo === 'habitaciones') {
      const val = this.busqueda.habitaciones;
      if (val === null || val === undefined || isNaN(Number(val))) {
        this.busquedaErrors.habitaciones = 'Ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.busquedaErrors.habitaciones = 'No se permiten números negativos.';
      } else if (Number(val) === 0) {
        this.busquedaErrors.habitaciones = 'Mínimo 1 habitación.';
      } else {
        this.busquedaErrors.habitaciones = '';
      }
    }

    if (campo === 'adultos') {
      const val = this.busqueda.adultos;
      if (val === null || val === undefined || isNaN(Number(val))) {
        this.busquedaErrors.adultos = 'Ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.busquedaErrors.adultos = 'No se permiten números negativos.';
      } else if (Number(val) === 0) {
        this.busquedaErrors.adultos = 'Mínimo 1 adulto.';
      } else {
        this.busquedaErrors.adultos = '';
      }
    }

    if (campo === 'ninos') {
      const val = this.busqueda.ninos;
      if (val === null || val === undefined || isNaN(Number(val))) {
        this.busquedaErrors.ninos = 'Ingrese un número válido.';
      } else if (Number(val) < 0) {
        this.busquedaErrors.ninos = 'No se permiten números negativos.';
      } else {
        this.busquedaErrors.ninos = '';
      }
    }
  }

  validarTodaBusqueda(): boolean {
    (['destino', 'llegada', 'salida', 'habitaciones', 'adultos', 'ninos'] as const)
      .forEach(c => this.validarBusqueda(c));
    return !Object.values(this.busquedaErrors).some(e => e !== '');
  }

  // Deslizador de rango dual
  onMinPriceInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = +target.value;
    if (val > this.filtroPrecioMax) {
      this.filtroPrecioMin = this.filtroPrecioMax;
    } else {
      this.filtroPrecioMin = val;
    }
    this.aplicarFiltros();
  }

  onMaxPriceInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = +target.value;
    if (val < this.filtroPrecioMin) {
      this.filtroPrecioMax = this.filtroPrecioMin;
    } else {
      this.filtroPrecioMax = val;
    }
    this.aplicarFiltros();
  }

  onPrecioMinChange(): void {
    if (this.filtroPrecioMin < 0) this.filtroPrecioMin = 0;
    if (this.filtroPrecioMin > this.filtroPrecioMax) {
      this.filtroPrecioMin = this.filtroPrecioMax;
    }
    this.aplicarFiltros();
  }

  onPrecioMaxChange(): void {
    if (this.filtroPrecioMax > 300) this.filtroPrecioMax = 300;
    if (this.filtroPrecioMax < this.filtroPrecioMin) {
      this.filtroPrecioMax = this.filtroPrecioMin;
    }
    this.sliderPrecioMax = this.filtroPrecioMax;
    this.aplicarFiltros();
  }

  getMinPercent(): number {
    return (this.filtroPrecioMin / 300) * 100;
  }

  getMaxPercent(): number {
    return (this.filtroPrecioMax / 300) * 100;
  }

  toggleEstrella(estrella: number): void {
    this.filtroEstrellas[estrella] = !this.filtroEstrellas[estrella];
    this.aplicarFiltros();
  }

  toggleTipo(tipo: string): void {
    this.filtroTipos[tipo] = !this.filtroTipos[tipo];
    this.aplicarFiltros();
  }


  toggleNinos(): void {
    this.filtroNinos = !this.filtroNinos;
    this.aplicarFiltros();
  }

  toggleMascotas(): void {
    this.filtroMascotas = !this.filtroMascotas;
    this.aplicarFiltros();
  }

  // Aplica todos los criterios acumulados sobre el dataset
  aplicarFiltros(): void {
    this.currentPage = 1;
    let result = [...this.lodgings];

    // 1. Filtrar por Rango de Precios (si el máximo es 300, se asume sin límite superior "+$300")
    result = result.filter(h => h.precio >= this.filtroPrecioMin && (this.filtroPrecioMax === 300 || h.precio <= this.filtroPrecioMax));

    // 3. Filtrar por Estrellas (si hay alguna seleccionada)
    const estrellasSeleccionadas = Object.keys(this.filtroEstrellas)
      .map(Number)
      .filter(key => this.filtroEstrellas[key]);
    if (estrellasSeleccionadas.length > 0) {
      result = result.filter(h => estrellasSeleccionadas.includes(h.categoria));
    }

    // 4. Filtrar por Tipo de Alojamiento (si hay alguno seleccionado)
    const tiposSeleccionados = Object.keys(this.filtroTipos)
      .filter(key => this.filtroTipos[key]);
    if (tiposSeleccionados.length > 0) {
      result = result.filter(h => tiposSeleccionados.includes(h.tipo));
    }


    // 6. Filtrar por Aceptación de Niños
    if (this.filtroNinos) {
      result = result.filter(h => h.aceptaNinos);
    }

    // 7. Filtrar por Aceptación de Mascotas
    if (this.filtroMascotas) {
      result = result.filter(h => h.aceptaMascotas);
    }

    // Ordenar los resultados
    this.ordenarResultados(result);

    // Actualizar tags de filtros activos
    this.generarTagsActivos();
  }

  // Ordena la lista de acuerdo a la opción seleccionada
  ordenarResultados(lista: Lodging[]): void {
    if (this.sortOption === 'precio_asc') {
      lista.sort((a, b) => a.precio - b.precio);
    } else if (this.sortOption === 'precio_desc') {
      lista.sort((a, b) => b.precio - a.precio);
    } else if (this.sortOption === 'valoracion') {
      lista.sort((a, b) => b.valoracion - a.valoracion);
    } else if (this.sortOption === 'nombre') {
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else {
      // 'recomendados' - Combina valoración alta y precio razonable
      lista.sort((a, b) => (b.valoracion * 100 - b.precio) - (a.valoracion * 100 - a.precio));
    }
    this.filteredLodgings = lista;
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOption = select.value;
    this.aplicarFiltros();
  }

  // Construye la lista de etiquetas que aparecen debajo de la cabecera
  generarTagsActivos(): void {
    const tags = [];

    // Tag de Precio
    if (this.filtroPrecioMin > 0 || this.filtroPrecioMax < 300) {
      tags.push({
        label: `$${this.filtroPrecioMin} – $${this.filtroPrecioMax} / noche`,
        type: 'precio',
        value: null
      });
    }

    // Tags de estrellas
    Object.keys(this.filtroEstrellas).forEach(e => {
      const estr = +e;
      if (this.filtroEstrellas[estr]) {
        tags.push({
          label: `${estr} Estrella${estr > 1 ? 's' : ''}`,
          type: 'estrella',
          value: estr
        });
      }
    });

    // Tags de tipo de alojamiento
    Object.keys(this.filtroTipos).forEach(t => {
      if (this.filtroTipos[t]) {
        tags.push({
          label: t,
          type: 'tipo',
          value: t
        });
      }
    });


    // Tag acepta niños
    if (this.filtroNinos) {
      tags.push({
        label: 'Acepta niños',
        type: 'ninos',
        value: null
      });
    }

    // Tag acepta mascotas
    if (this.filtroMascotas) {
      tags.push({
        label: 'Mascotas permitidas',
        type: 'mascotas',
        value: null
      });
    }

    this.activeTags = tags;
  }

  // Quita un filtro específico a través de su tag
  removerTag(tag: { label: string; type: string; value: any }): void {
    if (tag.type === 'precio') {
      this.filtroPrecioMin = 0;
      this.filtroPrecioMax = 300;
      this.sliderPrecioMax = 300;
    } else if (tag.type === 'estrella') {
      this.filtroEstrellas[tag.value] = false;
    } else if (tag.type === 'tipo') {
      this.filtroTipos[tag.value] = false;

    } else if (tag.type === 'ninos') {
      this.filtroNinos = false;
    } else if (tag.type === 'mascotas') {
      this.filtroMascotas = false;
    }
    this.aplicarFiltros();
  }

  // Limpia absolutamente todos los filtros secundarios
  limpiarFiltros(): void {
    this.filtroPrecioMin = 0;
    this.filtroPrecioMax = 300;
    this.sliderPrecioMax = 300;

    Object.keys(this.filtroEstrellas).forEach(k => this.filtroEstrellas[+k] = false);
    Object.keys(this.filtroTipos).forEach(k => this.filtroTipos[k] = false);


    this.filtroNinos = false;
    this.filtroMascotas = false;

    this.aplicarFiltros();
  }

  // Acción para cambiar estado favorito de un hotel
  toggleFavorito(lodging: Lodging, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    lodging.favorito = !lodging.favorito;
  }

  // Ejecuta una nueva búsqueda actualizando la URL con queryParams
  buscarNuevaBusqueda(): void {
    if (!this.validarTodaBusqueda()) return;
    const { destino, llegada, salida, habitaciones, adultos, ninos } = this.busqueda;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        destino: (destino || '').trim(),
        llegada: llegada || '',
        salida: salida || '',
        habitaciones,
        adultos,
        ninos
      },
      queryParamsHandling: 'merge'
    });
  }

  // Métodos de control para la paginación funcional
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  firstPage(): void {
    this.currentPage = 1;
  }

  lastPage(): void {
    this.currentPage = this.totalPages;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Generación rápida de array para pintar estrellas
  getEstrellasArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getEstrellasVaciasArray(count: number): number[] {
    return Array(5 - count).fill(0);
  }
}
