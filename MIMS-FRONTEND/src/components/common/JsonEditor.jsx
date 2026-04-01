import React from 'react';
import Textarea from './Textarea';

export default function JsonEditor({ label = 'JSON', value, onChange, error, rows = 6, hint, placeholder }) {
  const [text, setText] = React.useState(value ?? '{}');
  const [parseError, setParseError] = React.useState('');

  React.useEffect(() => {
    setText(value ?? '{}');
  }, [value]);

  const handleChange = (e) => {
    const next = e.target.value;
    setText(next);
    try {
      JSON.parse(next);
      setParseError('');
      onChange?.(next);
    } catch {
      setParseError('Invalid JSON');
    }
  };

  return (
    <Textarea
      label={label}
      rows={rows}
      value={text}
      onChange={handleChange}
      error={parseError || error?.message || error}
      hint={hint}
      placeholder={placeholder}
    />
  );
}

