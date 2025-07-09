import React, { useState } from 'react';
import { marked } from 'marked';

interface MarkdownNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
}

const MarkdownNotesField: React.FC<MarkdownNotesFieldProps> = ({
  value,
  onChange,
  label,
  placeholder,
  rows = 5
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="row mb-3">
      <label className="col-sm-3 col-form-label">{label}</label>
      <div className="col-sm-9">
        {isEditing ? (
          <textarea
            className="form-control"
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            rows={rows}
            placeholder={placeholder}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            dangerouslySetInnerHTML={{ __html: marked(value) }}
            style={{ 
              border: '1px solid #ced4da', 
              borderRadius: '.25rem', 
              padding: '.375rem .75rem', 
              minHeight: 'calc(1.5em + .75rem + 2px)',
              cursor: 'pointer'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownNotesField; 