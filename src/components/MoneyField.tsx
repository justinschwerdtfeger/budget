import * as React from 'react';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import { useState } from 'react';

/**
 * This component is a placeholder for FormControl to correctly set the shrink label state on SSR.
 */
function SSRInitialFilled(_: BaseNumberField.Root.Props) {
  return null;
}
SSRInitialFilled.muiName = 'Input';

export default function MoneyField({
  id: idProp,
  label,
  error,
  size = 'medium',
  ...other
}: BaseNumberField.Root.Props & {
  label?: React.ReactNode;
  size?: 'small' | 'medium';
  error?: boolean;
}) {
  let id = React.useId();
  if (idProp) {
    id = idProp;
  }

  // Use state to manage the displayed value as a string
  const [displayValue, setDisplayValue] = useState(other.defaultValue ? Number(other.defaultValue).toFixed(2) : '0.00');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Update the display value as the user types
    setDisplayValue(event.target.value);
  };

  const handleBlur = () => {
    const floatValue = parseFloat(displayValue);

    // If the value is a valid number, format it to 2 decimal places and update the state
    if (!isNaN(floatValue)) {
      setDisplayValue(floatValue.toFixed(2));
    } else {
      // Handle invalid input (optional: reset to '0.00' or previous valid value)
      setDisplayValue('0.00');
    }
  };

  return (
    <BaseNumberField.Root
      {...other}
      render={(props, state) => (
        <FormControl
          size={size}
          ref={props.ref}
          disabled={state.disabled}
          required={state.required}
          error={error}
          variant="outlined"
        >
          {props.children}
        </FormControl>
      )}
    >
      <SSRInitialFilled {...other} />
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <BaseNumberField.Input
        id={id}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        render={(props, state) => {
          return (
          <OutlinedInput
            label={label}
            inputRef={props.ref}
            value={state.value}
            onBlur={props.onBlur}
            onChange={props.onChange}
            onKeyUp={props.onKeyUp}
            onKeyDown={props.onKeyDown}
            onFocus={props.onFocus}
            slotProps={{
              input: props,
            }}
            sx={{ pr: 0 }}
          />
        )}}
      />
    </BaseNumberField.Root>
  );
}