import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.scss',
})
export class SidePanelComponent {
  @Input() public isOpen = false;
  @Input() public title = '';
  @Output() public closed = new EventEmitter<void>();

  public onClose(): void {
    this.closed.emit();
  }
}
