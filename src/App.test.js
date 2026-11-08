import { render, screen } from '@testing-library/react';
import App from './App';

test('renders portal login SITRAK-AI', () => {
  render(<App />);
  const titleElement = screen.getByText(/PORTAL AKSES SITRAK-AI/i);
  expect(titleElement).toBeInTheDocument();
});
