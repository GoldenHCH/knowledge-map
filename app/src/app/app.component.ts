import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingService } from './core/services/loading.service';
import { SidePanelComponent } from './shared/components/side-panel/side-panel.component';
import { ConnectAssistantComponent } from './knowledge-map/connect-assistant/connect-assistant.component';
import { IKnowledgeMap } from './knowledge-map/knowledge-map.interfaces';
import { MapViewComponent } from './knowledge-map/map-view/map-view.component';
import { TopicPickerComponent } from './knowledge-map/topic-picker/topic-picker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    SidePanelComponent,
    ConnectAssistantComponent,
    TopicPickerComponent,
    MapViewComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly _loadingService = inject(LoadingService);

  public readonly isLoading$ = this._loadingService.isLoading$;
  public readonly loadingMessage$ = this._loadingService.message$;
  public selectedMap: IKnowledgeMap | null = null;
  public isConnectPanelOpen = false;

  public onMapSelected(map: IKnowledgeMap): void {
    this.selectedMap = map;
  }

  public onBackRequested(): void {
    this.selectedMap = null;
  }

  public onConnectToggled(isOpen: boolean): void {
    this.isConnectPanelOpen = isOpen;
  }
}
