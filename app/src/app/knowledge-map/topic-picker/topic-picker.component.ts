import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { KnowledgeStoreService } from '../../core/services/knowledge-store.service';
import { LoadingService } from '../../core/services/loading.service';
import { TutorApiService } from '../../core/services/tutor-api.service';
import { AlertBannerComponent } from '../../shared/components/alert-banner/alert-banner.component';
import { seededMaps } from '../knowledge-map.constants';
import { landingDemoVideo } from '../media.constants';
import { SignupFormComponent } from '../signup-form/signup-form.component';
import { IKnowledgeMap } from '../knowledge-map.interfaces';

@Component({
  selector: 'app-topic-picker',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AlertBannerComponent,
    SignupFormComponent,
  ],
  templateUrl: './topic-picker.component.html',
  styleUrl: './topic-picker.component.scss',
})
export class TopicPickerComponent {
  private readonly _knowledgeStore = inject(KnowledgeStoreService);
  private readonly _loadingService = inject(LoadingService);
  private readonly _tutorApi = inject(TutorApiService);

  @Output() public mapSelected = new EventEmitter<IKnowledgeMap>();

  public readonly seededMaps: IKnowledgeMap[] = seededMaps;
  public readonly generatedMaps$ = this._knowledgeStore.generatedMaps$;
  public readonly demoVideo: { src: string; poster: string } = landingDemoVideo;
  public readonly howItWorks: { icon: string; title: string; text: string }[] = [
    {
      icon: 'checklist',
      title: 'Map what you know',
      text: 'Mark concepts you know, or import a transcript, course list or CV.',
    },
    {
      icon: 'alt_route',
      title: 'See only your gaps',
      text: 'Get a path of just the missing concepts, prerequisites first.',
    },
    {
      icon: 'psychology',
      title: 'Reason your way there',
      text: 'Lessons are three questions that start from what you know, with a reply on your thinking.',
    },
  ];
  public readonly previewKnown: string[] = ['Algebra basics', 'Derivatives', 'Vectors & matrices'];
  public topic = '';
  public isBusy = false;
  public errorMessage = '';

  public tryDemo(): void {
    const demoMap: IKnowledgeMap | undefined = this.seededMaps.find((map: IKnowledgeMap) => map.id === 'neural-network');

    if (!demoMap) {
      return;
    }

    this._knowledgeStore.loadSampleLearner(demoMap);
    this.mapSelected.emit(demoMap);
  }

  public scrollToSignup(): void {
    document.getElementById('early-access')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  public selectMap(map: IKnowledgeMap): void {
    this.mapSelected.emit(map);
  }

  public async submitTopic(): Promise<void> {
    const topic = this.topic.trim();

    if (!topic || this.isBusy) {
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';
    this._loadingService.show('Mapping the prerequisites…');

    try {
      const map = await this._tutorApi.generateMap(topic);
      this._knowledgeStore.saveGeneratedMap(map);
      this.mapSelected.emit(map);
    } catch {
      this.errorMessage = "We couldn't build that map just now. Try one of the ready-made maps above.";
    } finally {
      this.isBusy = false;
      this._loadingService.hide();
    }
  }

  public dismissError(): void {
    this.errorMessage = '';
  }
}
