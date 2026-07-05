// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../FilterBar';

describe('FilterBar', () => {
  it('renders children', () => {
    render(
      <FilterBar filters={{}} onRemoveFilter={vi.fn()} onClearAll={vi.fn()}>
        <input placeholder="search" />
      </FilterBar>,
    );
    expect(screen.getByPlaceholderText('search')).toBeInTheDocument();
  });

  it('does not show filter chips when no filters', () => {
    render(<FilterBar filters={{}} onRemoveFilter={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.queryByText(/:/)).not.toBeInTheDocument();
  });

  it('renders filter chips for each active filter', () => {
    render(
      <FilterBar filters={{ action: 'ban', status: 'active' }} onRemoveFilter={vi.fn()} onClearAll={vi.fn()} />,
    );
    expect(screen.getByText('action: ban')).toBeInTheDocument();
    expect(screen.getByText('status: active')).toBeInTheDocument();
  });

  it('calls onRemoveFilter when chip remove is clicked', async () => {
    const onRemove = vi.fn();
    render(
      <FilterBar filters={{ action: 'ban' }} onRemoveFilter={onRemove} onClearAll={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('×'));
    expect(onRemove).toHaveBeenCalledWith('action');
  });

  it('calls onClearAll when clear all is clicked', async () => {
    const onClear = vi.fn();
    render(
      <FilterBar filters={{ action: 'ban' }} onRemoveFilter={vi.fn()} onClearAll={onClear} />,
    );
    fireEvent.click(screen.getByText('Clear all'));
    expect(onClear).toHaveBeenCalled();
  });
});
