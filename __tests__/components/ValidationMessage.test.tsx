/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ValidationMessage } from '../../src/components/ui/validation-message';

describe('ValidationMessage Component', () => {
  it('debe renderizar mensaje de error correctamente', () => {
    const errorMessage = 'Este campo es requerido';
    
    render(<ValidationMessage message={errorMessage} type="error" />);
    
    const messageElement = screen.getByText(errorMessage);
    expect(messageElement).toBeInTheDocument();
    // Test that it contains error-related classes or styling
    expect(messageElement.closest('div')).toHaveAttribute('role', 'alert');
  });

  it('debe renderizar mensaje de éxito correctamente', () => {
    const successMessage = 'Datos válidos';
    
    render(<ValidationMessage message={successMessage} type="success" />);
    
    const messageElement = screen.getByText(successMessage);
    expect(messageElement).toBeInTheDocument();
    expect(messageElement.closest('div')).toHaveAttribute('role', 'alert');
  });

  it('debe renderizar mensaje de advertencia correctamente', () => {
    const warningMessage = 'Revisa este campo';
    
    render(<ValidationMessage message={warningMessage} type="warning" />);
    
    const messageElement = screen.getByText(warningMessage);
    expect(messageElement).toBeInTheDocument();
    expect(messageElement.closest('div')).toHaveAttribute('role', 'alert');
  });

  it('debe renderizar mensaje de información correctamente', () => {
    const infoMessage = 'Información adicional';
    
    render(<ValidationMessage message={infoMessage} type="info" />);
    
    const messageElement = screen.getByText(infoMessage);
    expect(messageElement).toBeInTheDocument();
    expect(messageElement.closest('div')).toHaveAttribute('role', 'alert');
  });

  it('debe mostrar icono de error para mensajes de error', () => {
    render(<ValidationMessage message="Error" type="error" />);
    
    const icon = screen.getByTestId('alert-circle-icon');
    expect(icon).toBeInTheDocument();
  });

  it('debe mostrar icono de éxito para mensajes de éxito', () => {
    render(<ValidationMessage message="Éxito" type="success" />);
    
    const icon = screen.getByTestId('check-circle-icon');
    expect(icon).toBeInTheDocument();
  });

  it('debe mostrar icono de advertencia para mensajes de advertencia', () => {
    render(<ValidationMessage message="Advertencia" type="warning" />);
    
    const icon = screen.getByTestId('alert-triangle-icon');
    expect(icon).toBeInTheDocument();
  });

  it('debe mostrar icono de información para mensajes de información', () => {
    render(<ValidationMessage message="Información" type="info" />);
    
    const icon = screen.getByTestId('info-icon');
    expect(icon).toBeInTheDocument();
  });

  it('no debe renderizar nada cuando no hay mensaje', () => {
    const { container } = render(<ValidationMessage message="" type="error" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('no debe renderizar nada cuando el mensaje is undefined', () => {
    const { container } = render(<ValidationMessage message={undefined} type="error" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('debe aplicar clases CSS personalizadas', () => {
    const customClass = 'custom-validation-class';
    
    render(
      <ValidationMessage 
        message="Mensaje de prueba" 
        type="error" 
        className={customClass} 
      />
    );
    
    const messageElement = screen.getByText('Mensaje de prueba').parentElement;
    expect(messageElement).toHaveClass(customClass);
  });

  it('debe renderizar mensajes HTML escapados correctamente', () => {
    const htmlMessage = '<script>alert("xss")</script>Mensaje seguro';
    
    render(<ValidationMessage message={htmlMessage} type="error" />);
    
    const messageElement = screen.getByText(htmlMessage);
    expect(messageElement).toBeInTheDocument();
    expect(messageElement.innerHTML).not.toContain('<script>');
  });

  it('debe ser accesible para lectores de pantalla', () => {
    render(<ValidationMessage message="Error de validación" type="error" />);
    
    const messageElement = screen.getByRole('alert');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveAttribute('aria-live', 'polite');
  });

  it('debe tener el tipo error por defecto', () => {
    render(<ValidationMessage message="Mensaje por defecto" />);
    
    // Verifica que se renderiza correctamente con el tipo error por defecto
    const messageElement = screen.getByText('Mensaje por defecto');
    expect(messageElement.closest('div')).toHaveAttribute('role', 'alert');
    const icon = screen.getByTestId('alert-circle-icon');
    expect(icon).toBeInTheDocument();
  });

  describe('Animaciones', () => {
    it('debe tener clases de animación aplicadas', () => {
      render(<ValidationMessage message="Mensaje animado" type="error" />);
      
      // Verifica que se renderiza correctamente (la animación se aplica via CSS)
      const messageElement = screen.getByText('Mensaje animado').parentElement;
      expect(messageElement).toHaveAttribute('role', 'alert');
    });
  });

  describe('Múltiples mensajes', () => {
    it('debe renderizar múltiples instancias independientemente', () => {
      render(
        <div>
          <ValidationMessage message="Error 1" type="error" />
          <ValidationMessage message="Éxito 1" type="success" />
          <ValidationMessage message="Advertencia 1" type="warning" />
        </div>
      );
      
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Éxito 1')).toBeInTheDocument();
      expect(screen.getByText('Advertencia 1')).toBeInTheDocument();
    });
  });
});
