// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsCard from '../StatsCard';

describe('StatsCard', () => {
  it('renders label and value', () => {
    render(<StatsCard label="Total Users" value={42} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders sub text when provided', () => {
    render(<StatsCard label="Servers" value={3} sub="+1 this week" />);
    expect(screen.getByText('+1 this week')).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(<StatsCard label="Status" value="healthy" />);
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });
});
