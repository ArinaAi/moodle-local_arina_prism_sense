import React, { useState, useEffect } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export type DebouncedTextFieldProps = TextFieldProps & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const DebouncedTextField: React.FC<DebouncedTextFieldProps> = (props) => {
  const { value: propValue, onChange, ...rest } = props;
  const [internalValue, setInternalValue] = useState(propValue);

  // Sync with external prop if it ever changes from outside
  useEffect(() => {
    setInternalValue(propValue);
  }, [propValue]);

  // But when typing locally, only update internal state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  };

  // Only bubble up the change event when the user stops typing (blurs out)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only call onChange if value actually changed
    if (internalValue !== propValue) {
      // Provide a synthetic-like event holding the latest value
      onChange({ target: { value: internalValue } } as React.ChangeEvent<HTMLInputElement>);
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <TextField
      {...rest}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};
