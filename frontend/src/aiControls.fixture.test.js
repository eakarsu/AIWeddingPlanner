import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import FullFieldPresets from './components/FullFieldPresets';
import AIReport from './components/AIReport';
import Login from './pages/Login';
import API from './services/api';

jest.mock('./services/api', () => ({ post: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

async function mount(element) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  return { host, close: () => { act(() => root.unmount()); host.remove(); } };
}

test('three presets fill required and optional fields without generation or changing real references', async () => {
  const onChange = jest.fn();
  const onSubmit = jest.fn();
  const upload = new File(['photo'], 'real-upload.jpg', { type: 'image/jpeg' });
  const value = { prompt: '', context: '', vendor_id: 42, upload };
  const presets = [
    { label: 'Garden', values: { prompt: 'Garden wedding for 120 guests', context: 'June ceremony', vendor_id: 99, upload: null } },
    { label: 'City', values: { prompt: 'City wedding for 80 guests', context: 'Autumn reception', vendor_id: 99, upload: null } },
    { label: 'Family', values: { prompt: 'Family wedding weekend', context: 'Three events', vendor_id: 99, upload: null } },
  ];
  const view = await mount(<form onSubmit={onSubmit}><FullFieldPresets value={value} presets={presets} onChange={onChange} /></form>);
  for (const button of view.host.querySelectorAll('button')) {
    await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }
  expect(onChange).toHaveBeenCalledTimes(3);
  for (const call of onChange.mock.calls) {
    expect(call[0].prompt).toBeTruthy();
    expect(call[0].context).toBeTruthy();
    expect(call[0].vendor_id).toBe(42);
    expect(call[0].upload).toBe(upload);
  }
  expect(onSubmit).not.toHaveBeenCalled();
  view.close();
});

test('returned and saved JSON render labeled facts, table, list, false, zero, and empty string', () => {
  const data = { summary: { approved: false, cost: 0, note: '' }, options: [{ name: 'Garden', guests: 120 }, { name: 'Hall', guests: 80 }], actions: ['Confirm date', 'Review budget'] };
  for (const response of [{ result: JSON.stringify(data) }, { result_json: data }]) {
    const html = renderToStaticMarkup(<AIReport response={response} title="Wedding report" />);
    expect(html).toContain('Summary');
    expect(html).toContain('Approved');
    expect(html).toContain('No');
    expect(html).toContain('Cost');
    expect(html).toContain('0');
    expect(html).toContain('Empty string');
    expect(html).toContain('<table');
    expect(html).toContain('<ul');
  }
});

test('demo login button calls the configured account route', async () => {
  const onLogin = jest.fn();
  API.post.mockResolvedValue({ data: { user: { id: 1, name: 'Demo' }, token: 'fixture-token' } });
  const view = await mount(<Login onLogin={onLogin} />);
  await act(async () => view.host.querySelector('[aria-label="Log in with demo account"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(API.post).toHaveBeenCalledWith('/auth/demo-login');
  expect(onLogin).toHaveBeenCalledTimes(1);
  view.close();
});
