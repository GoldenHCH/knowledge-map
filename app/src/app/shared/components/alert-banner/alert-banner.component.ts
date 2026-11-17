import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './alert-banner.component.html',
  styleUrl: './alert-banner.component.scss',
})
export class AlertBannerComponent {
  @Input() public message = '';
  @Output() public dismissed = new EventEmitter<void>();

  public onDismiss(): void {
    this.dismissed.emit();
  }
}
