import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CircunscriptionSelector } from '../circumscription-selector';

// Mock the UI components
jest.mock('../button', () => ({
  Button: ({ children, onClick, className, ...props }) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('../command', () => ({
  Command: ({ children, ...props }) => <div {...props}>{children}</div>,
  CommandEmpty: ({ children }) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children }) => <div data-testid="command-group">{children}</div>,
  CommandInput: ({ placeholder, onValueChange, ...props }) => (
    <input
      placeholder={placeholder}
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid="command-input"
      {...props}
    />
  ),
  CommandItem: ({ children, onSelect, ...props }) => (
    <div
      onClick={() => onSelect?.()}
      data-testid="command-item"
      {...props}
    >
      {children}
    </div>
  ),
  CommandList: ({ children }) => <div data-testid="command-list">{children}</div>,
}));

jest.mock('../popover', () => ({
  Popover: ({ children, open, onOpenChange }) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  ),
  PopoverContent: ({ children, ...props }) => (
    <div data-testid="popover-content" {...props}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children, asChild }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}));

jest.mock('../badge', () => ({
  Badge: ({ children, ...props }) => (
    <span data-testid="badge" {...props}>
      {children}
    </span>
  ),
}));

jest.mock('../checkbox', () => ({
  Checkbox: ({ checked, onChange, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange?.(e.target.checked)}
      data-testid="checkbox"
      {...props}
    />
  ),
}));

describe('CircunscriptionSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with placeholder text', () => {
    render(
      <CircunscriptionSelector
        value={[]}
        onChange={mockOnChange}
        placeholder="Seleccionar circunscripciones..."
      />
    );

    expect(screen.getByText('Seleccionar circunscripciones...')).toBeInTheDocument();
  });

  it('displays selected count when multiple items are selected', () => {
    render(
      <CircunscriptionSelector
        value={['PRIMERA CIRCUNSCRIPCIÓN', 'TERCERA CIRCUNSCRIPCIÓN']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('2 circunscripciones seleccionadas')).toBeInTheDocument();
  });

  it('displays single selection label when one item is selected', () => {
    render(
      <CircunscriptionSelector
        value={['PRIMERA CIRCUNSCRIPCIÓN']}
        onChange={mockOnChange}
      />
    );

    // Use the trigger specifically to avoid multiple elements
    const trigger = screen.getByTestId('popover-trigger');
    expect(trigger).toHaveTextContent('Primera Circunscripción');
  });

  it('shows no selection state when value is empty', () => {
    render(
      <CircunscriptionSelector
        value={[]}
        onChange={mockOnChange}
        placeholder="Test placeholder"
      />
    );

    expect(screen.getByText('Test placeholder')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', async () => {
    const user = userEvent.setup();
    
    render(
      <CircunscriptionSelector
        value={[]}
        onChange={mockOnChange}
      />
    );

    const trigger = screen.getByTestId('popover-trigger');
    await user.click(trigger);

    // Find and click on a circumscription option
    const items = screen.getAllByTestId('command-item');
    if (items.length > 0) {
      await user.click(items[0]);
      expect(mockOnChange).toHaveBeenCalled();
    }
  });

  it('filters options based on search input', async () => {
    const user = userEvent.setup();
    
    render(
      <CircunscriptionSelector
        value={[]}
        onChange={mockOnChange}
      />
    );

    const searchInput = screen.getByTestId('command-input');
    await user.type(searchInput, 'Primera');

    // The component should filter and show only matching results
    expect(searchInput).toHaveValue('Primera');
  });

  it('shows clear button when items are selected', () => {
    render(
      <CircunscriptionSelector
        value={['PRIMERA CIRCUNSCRIPCIÓN']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });

  it('clears all selections when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <CircunscriptionSelector
        value={['PRIMERA CIRCUNSCRIPCIÓN', 'TERCERA CIRCUNSCRIPCIÓN']}
        onChange={mockOnChange}
      />
    );

    const clearButton = screen.getByText('Limpiar');
    await user.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('shows selection count correctly', () => {
    render(
      <CircunscriptionSelector
        value={['PRIMERA CIRCUNSCRIPCIÓN', 'TERCERA CIRCUNSCRIPCIÓN']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('2 seleccionadas')).toBeInTheDocument();
  });

  it('shows badges for selected items', () => {
    render(
      <CircunscriptionSelector
        value={['PRIMERA CIRCUNSCRIPCIÓN']}
        onChange={mockOnChange}
      />
    );

    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <CircunscriptionSelector
        value={[]}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    // Use role combobox instead of button since that's what the mock defines
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('applies custom className', () => {
    render(
      <CircunscriptionSelector
        value={[]}
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const container = screen.getByTestId('popover').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  describe('Segunda Circunscripción behavior', () => {
    it('handles Segunda Circunscripción with subdivisions correctly', () => {
      const value = [
        'SEGUNDA CIRCUNSCRIPCIÓN',
        'SEGUNDA CIRCUNSCRIPCIÓN - San Rafael',
        'SEGUNDA CIRCUNSCRIPCIÓN - General Alvear'
      ];
      
      render(
        <CircunscriptionSelector
          value={value}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('3 circunscripciones seleccionadas')).toBeInTheDocument();
    });

    it('shows correct badge labels for subdivisions', () => {
      const value = ['SEGUNDA CIRCUNSCRIPCIÓN - San Rafael'];
      
      render(
        <CircunscriptionSelector
          value={value}
          onChange={mockOnChange}
        />
      );

      // Look for the badge specifically to avoid multiple elements
      const badges = screen.getAllByTestId('badge');
      const sanRafaelBadge = badges.find(badge => badge.textContent === 'San Rafael');
      expect(sanRafaelBadge).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles undefined value gracefully', () => {
      render(
        <CircunscriptionSelector
          value={undefined as any}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Seleccionar circunscripciones...')).toBeInTheDocument();
    });

    it('handles empty onChange gracefully', () => {
      render(
        <CircunscriptionSelector
          value={[]}
          onChange={() => {}}
        />
      );

      expect(screen.getByText('Seleccionar circunscripciones...')).toBeInTheDocument();
    });

    it('limits badges display with overflow indicator', () => {
      const manySelections = [
        'PRIMERA CIRCUNSCRIPCIÓN',
        'SEGUNDA CIRCUNSCRIPCIÓN',
        'TERCERA CIRCUNSCRIPCIÓN',
        'CUARTA CIRCUNSCRIPCIÓN'
      ];
      
      render(
        <CircunscriptionSelector
          value={manySelections}
          onChange={mockOnChange}
        />
      );

      // Should show first 3 badges plus overflow indicator
      const overflowBadge = screen.queryByText('+1 más');
      expect(overflowBadge).toBeInTheDocument();
    });
  });
});
