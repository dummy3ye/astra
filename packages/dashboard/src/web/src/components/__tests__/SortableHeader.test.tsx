// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SortableHeader from '../SortableHeader';

describe('SortableHeader', () => {
  it('renders label', () => {
    render(<SortableHeader field="name" label="Name" onSort={vi.fn()} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows asc arrow when active and asc', () => {
    render(
      <SortableHeader
        field="name"
        label="Name"
        currentSortBy="name"
        currentSortOrder="asc"
        onSort={vi.fn()}
      />
    );
    expect(screen.getByText('Name ▲')).toBeInTheDocument();
  });

  it('shows desc arrow when active and desc', () => {
    render(
      <SortableHeader
        field="name"
        label="Name"
        currentSortBy="name"
        currentSortOrder="desc"
        onSort={vi.fn()}
      />
    );
    expect(screen.getByText('Name ▼')).toBeInTheDocument();
  });

  it('calls onSort with field on click', async () => {
    const onSort = vi.fn();
    render(<SortableHeader field="name" label="Name" onSort={onSort} />);
    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('shows no arrow when not active', () => {
    render(
      <SortableHeader
        field="name"
        label="Name"
        currentSortBy="other"
        currentSortOrder="asc"
        onSort={vi.fn()}
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
  });
});
