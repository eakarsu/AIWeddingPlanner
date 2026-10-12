import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FeaturePage from './pages/FeaturePage';
import NotesPage from './pages/NotesPage';
import API from './services/api';
import { recordRows } from './services/recordRows';

jest.mock('./services/api', () => ({ get: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

const vendors = Array.from({ length: 15 }, (_, index) => ({
  id: index + 1, name: `Wedding vendor ${index + 1}`, category: 'Catering',
  contact_email: `vendor${index + 1}@example.com`, price_range: '$2,000–$4,000', rating: 4.5,
}));

async function renderView(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(element); });
  await act(async () => { await Promise.resolve(); });
  return { host, close: () => { act(() => root.unmount()); host.remove(); } };
}

afterEach(() => { jest.clearAllMocks(); });

test('accepts existing and paginated record arrays while rejecting malformed responses', () => {
  expect(recordRows(vendors)).toHaveLength(15);
  expect(recordRows({ data: vendors, pagination: { total: 15 } })).toHaveLength(15);
  expect(() => recordRows({ data: {} })).toThrow(/record list/);
});

test('vendor table renders 15 records from a paginated API response without console errors', async () => {
  API.get.mockResolvedValue({ data: { data: vendors, pagination: { total: 15 } } });
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const view = await renderView(<MemoryRouter initialEntries={['/vendors']}><Routes><Route path="/:feature" element={<FeaturePage />} /></Routes></MemoryRouter>);
  expect(view.host.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(15);
  expect(view.host.textContent).toContain('Wedding vendor 15');
  expect(error).not.toHaveBeenCalled();
  view.close(); error.mockRestore();
});

test('notes grid renders 15 cards from the API response without console errors', async () => {
  API.get.mockResolvedValue({ data: Array.from({ length: 15 }, (_, index) => ({ id: index + 1, title: `Wedding planning note ${index + 1}`, content: 'Review ceremony logistics', category: 'Planning' })) });
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const view = await renderView(<MemoryRouter><NotesPage /></MemoryRouter>);
  expect(view.host.textContent).toContain('15 notes');
  expect(view.host.textContent).toContain('Wedding planning note 15');
  expect(error).not.toHaveBeenCalled();
  view.close(); error.mockRestore();
});
