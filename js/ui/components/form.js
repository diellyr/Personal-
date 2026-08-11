import { h } from '../dom.js';

function optionList(opts) {
  return opts.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

/**
 * fields: [{ key, label, type, options, required, placeholder, hint, full }]
 * types: text, textarea, number, money, date, datetime, email, select, checkbox, multiselect
 */
export function renderForm(fields, values = {}) {
  const inputs = {};
  const rowWrap = h('div', {});
  let currentRow = null;

  fields.forEach((f, idx) => {
    if (idx % 2 === 0 || f.full) {
      currentRow = h('div', { class: 'form-row' });
      rowWrap.appendChild(currentRow);
    }
    const fieldEl = h('div', { class: 'form-field', style: f.full ? 'grid-column: 1 / -1' : '' });
    const labelEl = h('label', {}, f.label + (f.required ? ' *' : ''));
    let input;
    const val = values[f.key] !== undefined && values[f.key] !== null ? values[f.key] : (f.default !== undefined ? f.default : '');

    if (f.type === 'textarea') {
      input = h('textarea', { placeholder: f.placeholder || '' }, val);
    } else if (f.type === 'select') {
      const opts = optionList(f.options || []);
      input = h('select', {}, [
        f.allowEmpty !== false ? h('option', { value: '' }, f.placeholder || 'Selecione…') : null,
        ...opts.map((o) => h('option', { value: o.value, selected: String(o.value) === String(val) || undefined }, o.label)),
      ]);
      input.value = val || '';
    } else if (f.type === 'checkbox') {
      input = h('input', { type: 'checkbox', checked: val ? true : undefined });
      fieldEl.classList.add('checkbox-row');
    } else if (f.type === 'multiselect') {
      const opts = optionList(f.options || []);
      const selected = new Set(Array.isArray(val) ? val : []);
      input = h('div', { class: 'pill-list' }, opts.map((o) => {
        const id = `ms_${f.key}_${o.value}`;
        const cb = h('input', { type: 'checkbox', id, checked: selected.has(o.value) || undefined });
        cb.dataset.value = o.value;
        return h('label', { class: 'checkbox-row', style: 'font-weight:400' }, [cb, o.label]);
      }));
      input.dataset.multiselect = 'true';
    } else {
      input = h('input', {
        type: f.type === 'money' ? 'number' : (f.type || 'text'),
        step: f.type === 'money' ? '0.01' : undefined,
        placeholder: f.placeholder || '',
        value: val,
      });
    }
    input.dataset.key = f.key;
    inputs[f.key] = { el: input, field: f };
    if (f.type === 'checkbox') {
      fieldEl.appendChild(input);
      fieldEl.appendChild(labelEl);
    } else {
      fieldEl.appendChild(labelEl);
      fieldEl.appendChild(input);
    }
    if (f.hint) fieldEl.appendChild(h('div', { class: 'field-hint' }, f.hint));
    currentRow.appendChild(fieldEl);
  });

  function getValues() {
    const out = {};
    for (const [key, { el, field }] of Object.entries(inputs)) {
      if (field.type === 'checkbox') out[key] = el.checked;
      else if (field.type === 'number' || field.type === 'money') out[key] = el.value === '' ? null : Number(el.value);
      else if (field.type === 'multiselect') {
        out[key] = Array.from(el.querySelectorAll('input[type=checkbox]')).filter((c) => c.checked).map((c) => c.dataset.value);
      } else out[key] = el.value;
    }
    return out;
  }

  function validate() {
    const errors = [];
    for (const f of fields) {
      if (f.required) {
        const v = getValues()[f.key];
        if (v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0)) {
          errors.push(`${f.label} é obrigatório.`);
        }
      }
    }
    return errors;
  }

  return { node: rowWrap, getValues, validate, inputs };
}
