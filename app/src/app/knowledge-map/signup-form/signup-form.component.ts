import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SignupService } from '../../core/services/signup.service';
import { AlertBannerComponent } from '../../shared/components/alert-banner/alert-banner.component';

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
  ],
  templateUrl: './signup-form.component.html',
  styleUrl: './signup-form.component.scss',
})
export class SignupFormComponent {
  private readonly _signupService: SignupService = inject(SignupService);

  public readonly form: FormGroup = new FormGroup({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    goal: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
  });
  public isSubmitting: boolean = false;
  public isDone: boolean = false;
  public errorMessage: string = '';

  public async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      await this._signupService.signUp({
        email: String(this.form.value['email']).trim(),
        goal: String(this.form.value['goal'] ?? '').trim(),
      });
      this.isDone = true;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : "We couldn't save that just now. Please try again.";
    } finally {
      this.isSubmitting = false;
    }
  }

  public onDismissError(): void {
    this.errorMessage = '';
  }
}
