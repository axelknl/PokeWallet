import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonInput, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircleOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-custom-input',
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonInput, IonIcon],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor {
  @ViewChild('inputEl') inputElement!: ElementRef;
  
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' = 'text';
  @Input() placeholder: string = '';
  @Input() label: string = '';
  @Input() name: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() maxLength: number | null = null;
  @Input() minLength: number | null = null;
  @Input() max: number | null = null;
  @Input() min: number | null = null;
  @Input() step: number | null = null;
  @Input() pattern: string | RegExp = '';
  @Input() autocomplete: string = 'off';
  @Input() autocapitalize: string = 'off';
  @Input() errorMessage: string = '';
  @Input() showClearButton: boolean = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() focus = new EventEmitter<FocusEvent>();
  @Output() blur = new EventEmitter<FocusEvent>();
  @Output() clear = new EventEmitter<void>();

  value: string = '';
  isFocused: boolean = false;
  isDisabled: boolean = false;
  touched: boolean = false;

  onChange: (_: any) => void = () => {};
  onTouched: () => void = () => {};

  constructor() {
    addIcons({ closeCircleOutline, alertCircleOutline });
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  // Event handlers
  onInputFocus(event: FocusEvent): void {
    this.isFocused = true;
    this.focus.emit(event);
  }

  onInputBlur(event: FocusEvent): void {
    this.isFocused = false;
    this.touched = true;
    this.onTouched();
    this.blur.emit(event);
  }

  onInputChange(event: any): void {
    const value = event.target.value;
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  onClearClick(): void {
    this.value = '';
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.clear.emit();
    // Focus on the input after clearing
    if (this.inputElement && this.inputElement.nativeElement) {
      this.inputElement.nativeElement.focus();
    }
  }

  // Helper methods to check input state
  get isFilled(): boolean {
    return !!this.value;
  }

  get hasError(): boolean {
    return !!this.errorMessage && this.touched;
  }

  get inputClasses(): string {
    let classes = '';
    if (this.isFocused) classes += ' active';
    if (this.isFilled) classes += ' filled';
    if (this.hasError) classes += ' has-error';
    if (this.isDisabled) classes += ' disabled';
    if (this.readonly) classes += ' readonly';
    return classes;
  }
}
