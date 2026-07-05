// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExportButton from '../ExportButton';

describe('ExportButton', () => {
  it('renders button with label', () => {
    render(<ExportButton data={[]} filename="test.csv" columns={[]} />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('is disabled when data is empty', () => {
    render(
      <ExportButton
        data={[]}
        filename="test.csv"
        columns={[{ key: 'id', label: 'ID' }]}
      />
    );
    expect(screen.getByText('Export CSV')).toBeDisabled();
  });

  it('is enabled when data is non-empty', () => {
    render(
      <ExportButton
        data={[{ id: 1 }]}
        filename="test.csv"
        columns={[{ key: 'id', label: 'ID' }]}
      />
    );
    expect(screen.getByText('Export CSV')).toBeEnabled();
  });
});
