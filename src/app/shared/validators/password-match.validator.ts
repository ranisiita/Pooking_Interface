import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordMatchValidator(
  passwordKey = 'password',
  confirmKey = 'confirmPassword'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value ?? '';
    const confirm  = group.get(confirmKey)?.value ?? '';
    if (!confirm) return null; // "required" handled by the control itself
    return password === confirm
      ? null
      : { passwordMismatch: 'Las contraseñas no coinciden.' };
  };
}
