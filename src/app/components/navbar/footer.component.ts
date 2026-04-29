import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

interface FooterLink {
  label: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  @Input() brandName = 'Pooking.com';
  @Input() copyrightText = 'Todos los derechos reservados.';
  @Input() sections: FooterSection[] = [
    {
      title: 'Asistencia',
      links: [
        { label: 'Centro de ayuda' },
        { label: 'Cómo funciona' },
        { label: 'Contáctanos' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { label: 'Sobre nosotros' },
        { label: 'Términos y condiciones' },
        { label: 'Privacidad' },
      ],
    },
  ];
}
