import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TutorChatService } from '../../core/services/tutor-chat.service';
import { AlertBannerComponent } from '../../shared/components/alert-banner/alert-banner.component';
import { ITutorChatMessage } from './tutor-chat.interfaces';

@Component({
  selector: 'app-tutor-chat',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, AlertBannerComponent],
  templateUrl: './tutor-chat.component.html',
  styleUrl: './tutor-chat.component.scss',
})
export class TutorChatComponent implements OnChanges {
  @Input() public conceptTitle = '';
  @Input() public conceptSummary = '';
  @Input() public goalTitle = '';
  @Input() public knownTitles: string[] = [];
  @Input() public shakyTitles: string[] = [];
  @Input() public contextNote = '';

  @ViewChild('messageList') public messageList?: ElementRef<HTMLElement>;

  public messages: ITutorChatMessage[] = [];
  public draft = '';
  public isStreaming = false;
  public errorMessage = '';

  private readonly _chat: TutorChatService = inject(TutorChatService);
  private readonly _changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
  private _conversationId = 0;

  public get starters(): string[] {
    return ['Give me a smaller first step', 'Show me an example', `Why does this matter for ${this.goalTitle}?`];
  }

  public get canSend(): boolean {
    return !this.isStreaming && this.draft.trim().length > 0;
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['conceptTitle'] && !changes['conceptTitle'].firstChange) {
      this._conversationId++;
      this.messages = [];
      this.draft = '';
      this.isStreaming = false;
      this.errorMessage = '';
    }
  }

  public onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send(this.draft);
    }
  }

  public onSendClick(): void {
    void this.send(this.draft);
  }

  public onStarter(text: string): void {
    void this.send(text);
  }

  public onDismissError(): void {
    this.errorMessage = '';
  }

  public async send(text: string): Promise<void> {
    const trimmed: string = text.trim();

    if (this.isStreaming || trimmed.length === 0) {
      return;
    }

    const conversationId: number = this._conversationId;
    const history: ITutorChatMessage[] = [...this.messages, { role: 'learner', text: trimmed }];
    const reply: ITutorChatMessage = { role: 'tutor', text: '' };

    this.errorMessage = '';
    this.draft = '';
    this.isStreaming = true;
    this.messages = [...history, reply];
    this._refresh();

    try {
      await this._chat.streamReply(
        {
          conceptTitle: this.conceptTitle,
          conceptSummary: this.conceptSummary,
          goalTitle: this.goalTitle,
          knownTitles: this.knownTitles,
          shakyTitles: this.shakyTitles,
          contextNote: this.contextNote,
          messages: history,
        },
        (delta: string) => {
          if (conversationId !== this._conversationId) {
            return;
          }

          reply.text += delta;
          this._refresh();
        },
      );
    } catch (error) {
      if (conversationId === this._conversationId) {
        this.errorMessage = error instanceof Error ? error.message : 'The tutor is unavailable right now.';
      }
    }

    if (conversationId !== this._conversationId) {
      return;
    }

    if (reply.text.length === 0) {
      this.messages = history;
      this.draft = trimmed;
    }

    this.isStreaming = false;
    this._refresh();
  }

  private _refresh(): void {
    this._changeDetector.detectChanges();

    const list: HTMLElement | undefined = this.messageList?.nativeElement;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }
}
