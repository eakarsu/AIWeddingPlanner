import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

const featureConfig = {
  vendors: {
    title: 'Vendor Matching', icon: '🤝', endpoint: '/vendors',
    columns: ['name', 'category', 'contact_email', 'phone', 'price_range', 'rating'],
    columnLabels: ['Name', 'Category', 'Email', 'Phone', 'Price Range', 'Rating'],
    fields: [
      { key: 'name', label: 'Vendor Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['Catering', 'Florist', 'Photography', 'DJ/Music', 'Bakery', 'Bridal Wear', 'Transportation', 'Rentals', 'Decoration', 'Videography', 'Beauty', 'Officiant', 'Stationery', 'Live Band', 'Venue'] },
      { key: 'contact_email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'price_range', label: 'Price Range', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', step: '0.1', min: '0', max: '5' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'website', label: 'Website', type: 'text' },
    ],
    nameField: 'name',
    filterColumn: 'category',
  },
  budget: {
    title: 'Budget Manager', icon: '💰', endpoint: '/budget',
    columns: ['item_name', 'category', 'estimated_cost', 'actual_cost', 'paid'],
    columnLabels: ['Item', 'Category', 'Estimated', 'Actual', 'Paid'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['Venue', 'Catering', 'Photography', 'Videography', 'Florals', 'Music', 'Cake', 'Attire', 'Stationery', 'Transportation', 'Decorations', 'Beauty', 'Officiant', 'Favors', 'Misc'] },
      { key: 'estimated_cost', label: 'Estimated Cost ($)', type: 'number' },
      { key: 'actual_cost', label: 'Actual Cost ($)', type: 'number' },
      { key: 'paid', label: 'Paid', type: 'checkbox' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'item_name',
    filterColumn: 'category',
    formatters: {
      estimated_cost: v => v ? `$${Number(v).toLocaleString()}` : '-',
      actual_cost: v => v ? `$${Number(v).toLocaleString()}` : '-',
      paid: v => v ? 'Yes' : 'No',
    },
    summaryRow: (data) => {
      const est = data.reduce((s, d) => s + Number(d.estimated_cost || 0), 0);
      const act = data.reduce((s, d) => s + Number(d.actual_cost || 0), 0);
      return { item_name: `Total (${data.length} items)`, estimated_cost: `$${est.toLocaleString()}`, actual_cost: `$${act.toLocaleString()}`, paid: `${data.filter(d => d.paid).length}/${data.length}` };
    },
  },
  timeline: {
    title: 'Timeline & Checklist', icon: '📅', endpoint: '/timeline',
    columns: ['title', 'category', 'due_date', 'priority', 'completed'],
    columnLabels: ['Task', 'Category', 'Due Date', 'Priority', 'Status'],
    fields: [
      { key: 'title', label: 'Task Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'due_date', label: 'Due Date', type: 'date' },
      { key: 'category', label: 'Category', type: 'select', options: ['Venue', 'Photography', 'Catering', 'Music', 'Florals', 'Stationery', 'Attire', 'Transportation', 'Planning', 'Cake', 'Other'] },
      { key: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
      { key: 'completed', label: 'Completed', type: 'checkbox' },
    ],
    nameField: 'title',
    filterColumn: 'category',
    formatters: {
      due_date: v => v ? new Date(v).toLocaleDateString() : '-',
      completed: v => v ? 'Done' : 'Pending',
    },
    rowClass: (item) => {
      if (item.completed) return '';
      if (item.due_date && new Date(item.due_date) < new Date()) return 'row-overdue';
      return '';
    },
    showTemplates: true,
    summaryRow: (data) => {
      const done = data.filter(d => d.completed).length;
      const overdue = data.filter(d => !d.completed && d.due_date && new Date(d.due_date) < new Date()).length;
      return { title: `${done}/${data.length} completed${overdue > 0 ? ` (${overdue} overdue)` : ''}` };
    },
  },
  seating: {
    title: 'Seating Arrangement', icon: '🪑', endpoint: '/seating',
    columns: ['table_name', 'table_number', 'capacity', 'guest_names'],
    columnLabels: ['Table Name', '#', 'Capacity', 'Guests'],
    fields: [
      { key: 'table_name', label: 'Table Name', type: 'text', required: true },
      { key: 'table_number', label: 'Table Number', type: 'number' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'guest_names', label: 'Guest Names', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'table_name',
    summaryRow: (data) => {
      const totalCap = data.reduce((s, d) => s + Number(d.capacity || 0), 0);
      return { table_name: `${data.length} tables`, capacity: totalCap };
    },
  },
  guests: {
    title: 'Guest Management', icon: '👥', endpoint: '/guests',
    columns: ['name', 'email', 'rsvp_status', 'meal_preference', 'group_name', 'plus_one'],
    columnLabels: ['Name', 'Email', 'RSVP', 'Meal', 'Group', '+1'],
    fields: [
      { key: 'name', label: 'Guest Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'rsvp_status', label: 'RSVP Status', type: 'select', options: ['pending', 'confirmed', 'declined'] },
      { key: 'meal_preference', label: 'Meal Preference', type: 'select', options: ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Pescatarian', 'Diabetic-Friendly', 'Other'] },
      { key: 'plus_one', label: 'Plus One', type: 'checkbox' },
      { key: 'group_name', label: 'Group', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'name',
    filterColumn: 'rsvp_status',
    formatters: {
      plus_one: v => v ? 'Yes' : 'No',
    },
    summaryRow: (data) => {
      const confirmed = data.filter(d => d.rsvp_status === 'confirmed').length;
      const pending = data.filter(d => d.rsvp_status === 'pending').length;
      const plusOnes = data.filter(d => d.plus_one).length;
      return { name: `${data.length} guests (+${plusOnes} plus-ones)`, rsvp_status: `${confirmed} confirmed, ${pending} pending` };
    },
  },
  venues: {
    title: 'Venue Search', icon: '🏛️', endpoint: '/venues',
    columns: ['name', 'venue_type', 'capacity', 'price', 'rating'],
    columnLabels: ['Name', 'Type', 'Capacity', 'Price', 'Rating'],
    fields: [
      { key: 'name', label: 'Venue Name', type: 'text', required: true },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'price', label: 'Price ($)', type: 'number' },
      { key: 'venue_type', label: 'Type', type: 'select', options: ['Garden', 'Ballroom', 'Beach', 'Winery', 'Historic', 'Rooftop', 'Barn', 'Lodge', 'Museum', 'Castle', 'Resort', 'Loft', 'Chapel', 'Yacht Club', 'Other'] },
      { key: 'contact', label: 'Contact', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', step: '0.1', min: '0', max: '5' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'name',
    filterColumn: 'venue_type',
    formatters: {
      price: v => v ? `$${Number(v).toLocaleString()}` : '-',
    },
  },
  menu: {
    title: 'Menu Planning', icon: '🍽️', endpoint: '/menu',
    columns: ['item_name', 'course', 'dietary_info', 'price', 'selected'],
    columnLabels: ['Item', 'Course', 'Dietary', 'Price', 'Selected'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'course', label: 'Course', type: 'select', options: ['Appetizer', 'Soup', 'Salad', 'Main Course', 'Dessert', 'Beverage'] },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'dietary_info', label: 'Dietary Info', type: 'text' },
      { key: 'price', label: 'Price ($)', type: 'number' },
      { key: 'selected', label: 'Selected', type: 'checkbox' },
    ],
    nameField: 'item_name',
    filterColumn: 'course',
    formatters: {
      price: v => v ? `$${Number(v).toLocaleString()}` : '-',
      selected: v => v ? 'Yes' : 'No',
    },
    summaryRow: (data) => {
      const selected = data.filter(d => d.selected);
      const total = selected.reduce((s, d) => s + Number(d.price || 0), 0);
      return { item_name: `${selected.length} selected items`, price: `$${total.toLocaleString()}` };
    },
  },
  invitations: {
    title: 'Invitations', icon: '💌', endpoint: '/invitations',
    columns: ['guest_name', 'guest_email', 'style', 'status', 'sent_date'],
    columnLabels: ['Guest', 'Email', 'Style', 'Status', 'Sent'],
    fields: [
      { key: 'guest_name', label: 'Guest Name', type: 'text', required: true },
      { key: 'guest_email', label: 'Email', type: 'email' },
      { key: 'style', label: 'Style', type: 'select', options: ['Classic Elegant', 'Modern Minimal', 'Rustic Charm', 'Tropical', 'Bohemian', 'Vintage', 'Other'] },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'sent', 'delivered', 'opened', 'responded'] },
      { key: 'sent_date', label: 'Sent Date', type: 'date' },
      { key: 'response_date', label: 'Response Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'guest_name',
    filterColumn: 'status',
    formatters: {
      sent_date: v => v ? new Date(v).toLocaleDateString() : '-',
    },
  },
  registry: {
    title: 'Wedding Registry', icon: '🎁', endpoint: '/registry',
    columns: ['item_name', 'category', 'price', 'store', 'purchased'],
    columnLabels: ['Item', 'Category', 'Price', 'Store', 'Purchased'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['Kitchen', 'Home', 'Bedroom', 'Bathroom', 'Patio', 'Electronics', 'Experience', 'Bar', 'Charity', 'Other'] },
      { key: 'price', label: 'Price ($)', type: 'number' },
      { key: 'store', label: 'Store', type: 'text' },
      { key: 'url', label: 'URL', type: 'text' },
      { key: 'purchased', label: 'Purchased', type: 'checkbox' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'item_name',
    filterColumn: 'category',
    formatters: {
      price: v => v ? `$${Number(v).toLocaleString()}` : '-',
      purchased: v => v ? 'Yes' : 'No',
    },
    summaryRow: (data) => {
      const total = data.reduce((s, d) => s + Number(d.price || 0), 0);
      const purchased = data.filter(d => d.purchased).length;
      return { item_name: `${data.length} items (${purchased} purchased)`, price: `$${total.toLocaleString()}` };
    },
  },
  photography: {
    title: 'Photography', icon: '📸', endpoint: '/photography',
    columns: ['photographer_name', 'style', 'package_name', 'price', 'hours', 'rating'],
    columnLabels: ['Photographer', 'Style', 'Package', 'Price', 'Hours', 'Rating'],
    fields: [
      { key: 'photographer_name', label: 'Photographer Name', type: 'text', required: true },
      { key: 'style', label: 'Style', type: 'select', options: ['Documentary', 'Fine Art', 'Traditional', 'Bohemian', 'Modern', 'Classic', 'Adventure', 'Candid', 'Luxury', 'Romantic', 'Contemporary', 'Vintage', 'Aerial', 'Photo Booth', 'Videography'] },
      { key: 'package_name', label: 'Package', type: 'text' },
      { key: 'price', label: 'Price ($)', type: 'number' },
      { key: 'hours', label: 'Hours', type: 'number' },
      { key: 'includes', label: 'Includes', type: 'textarea' },
      { key: 'contact', label: 'Contact', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', step: '0.1', min: '0', max: '5' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'photographer_name',
    filterColumn: 'style',
    formatters: {
      price: v => v ? `$${Number(v).toLocaleString()}` : '-',
    },
  },
  music: {
    title: 'Music & Entertainment', icon: '🎵', endpoint: '/music',
    columns: ['name', 'type', 'genre', 'price', 'hours', 'rating'],
    columnLabels: ['Name', 'Type', 'Genre', 'Price', 'Hours', 'Rating'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['DJ', 'Live Band', 'String Quartet', 'Jazz Ensemble', 'Solo Acoustic', 'Harpist', 'Mariachi Band', 'Steel Drum', 'Pianist', 'Orchestra', 'Other'] },
      { key: 'genre', label: 'Genre', type: 'text' },
      { key: 'price', label: 'Price ($)', type: 'number' },
      { key: 'hours', label: 'Hours', type: 'number' },
      { key: 'contact', label: 'Contact', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'number', step: '0.1', min: '0', max: '5' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'name',
    filterColumn: 'type',
    formatters: {
      price: v => v ? `$${Number(v).toLocaleString()}` : '-',
    },
  },
  florals: {
    title: 'Floral Arrangements', icon: '💐', endpoint: '/florals',
    columns: ['item_name', 'flower_type', 'color', 'quantity', 'price', 'vendor'],
    columnLabels: ['Item', 'Flower', 'Color', 'Qty', 'Price', 'Vendor'],
    fields: [
      { key: 'item_name', label: 'Arrangement Name', type: 'text', required: true },
      { key: 'flower_type', label: 'Flower Type', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'price', label: 'Price ($)', type: 'number' },
      { key: 'vendor', label: 'Vendor', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'item_name',
    formatters: {
      price: v => v ? `$${Number(v).toLocaleString()}` : '-',
    },
  },
  transportation: {
    title: 'Transportation', icon: '🚗', endpoint: '/transportation',
    columns: ['vehicle_type', 'company', 'capacity', 'price', 'pickup_time', 'pickup_location'],
    columnLabels: ['Vehicle', 'Company', 'Capacity', 'Price', 'Pickup', 'From'],
    fields: [
      { key: 'vehicle_type', label: 'Vehicle Type', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'price', label: 'Price ($)', type: 'number' },
      { key: 'pickup_time', label: 'Pickup Time', type: 'time' },
      { key: 'pickup_location', label: 'Pickup Location', type: 'text' },
      { key: 'dropoff_location', label: 'Dropoff Location', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'vehicle_type',
    formatters: {
      price: v => v ? `$${Number(v).toLocaleString()}` : '-',
    },
  },
  accommodation: {
    title: 'Accommodation', icon: '🏨', endpoint: '/accommodation',
    columns: ['hotel_name', 'room_type', 'price_per_night', 'nights', 'guests_count', 'check_in'],
    columnLabels: ['Hotel', 'Room', 'Per Night', 'Nights', 'Guests', 'Check-In'],
    fields: [
      { key: 'hotel_name', label: 'Hotel Name', type: 'text', required: true },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'room_type', label: 'Room Type', type: 'text' },
      { key: 'price_per_night', label: 'Price/Night ($)', type: 'number' },
      { key: 'nights', label: 'Nights', type: 'number' },
      { key: 'guests_count', label: 'Guests', type: 'number' },
      { key: 'check_in', label: 'Check-In', type: 'date' },
      { key: 'check_out', label: 'Check-Out', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    nameField: 'hotel_name',
    formatters: {
      price_per_night: v => v ? `$${Number(v).toLocaleString()}` : '-',
      check_in: v => v ? new Date(v).toLocaleDateString() : '-',
      check_out: v => v ? new Date(v).toLocaleDateString() : '-',
    },
    summaryRow: (data) => {
      const totalCost = data.reduce((s, d) => s + (Number(d.price_per_night || 0) * Number(d.nights || 0)), 0);
      const totalGuests = data.reduce((s, d) => s + Number(d.guests_count || 0), 0);
      return { hotel_name: `${data.length} bookings`, price_per_night: `$${totalCost.toLocaleString()} total`, guests_count: totalGuests };
    },
  },
};

function FeaturePage() {
  const { feature } = useParams();
  const navigate = useNavigate();
  const config = featureConfig[feature];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);

  const fetchData = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    try {
      const res = await API.get(config.endpoint);
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [config]);

  useEffect(() => {
    fetchData();
    setSearchQuery('');
    setFilterValue('');
    setSortColumn(null);
  }, [fetchData]);

  const filterOptions = useMemo(() => {
    if (!config?.filterColumn) return [];
    const vals = [...new Set(data.map(d => d[config.filterColumn]).filter(Boolean))];
    return vals.sort();
  }, [data, config]);

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        config.columns.some(col => {
          const val = item[col];
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }
    if (filterValue && config.filterColumn) {
      result = result.filter(item => item[config.filterColumn] === filterValue);
    }
    if (sortColumn) {
      result.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const comp = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comp : -comp;
      });
    }
    return result;
  }, [data, searchQuery, filterValue, sortColumn, sortDirection, config]);

  if (!config) {
    return <div className="empty-state"><h3>Feature not found</h3></div>;
  }

  const formatValue = (key, value) => {
    if (config.formatters?.[key]) return config.formatters[key](value);
    if (key === 'rating' && value) return '⭐ ' + value;
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const getStatusClass = (key, value) => {
    const val = String(value).toLowerCase();
    if (['confirmed', 'completed', 'sent', 'done', 'yes'].includes(val) || value === true) return 'status-confirmed';
    if (['pending', 'draft', 'no'].includes(val) || value === false) return 'status-pending';
    if (['declined', 'cancelled'].includes(val)) return 'status-declined';
    return '';
  };

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    const headers = config.columnLabels.join(',');
    const rows = filteredData.map(item =>
      config.columns.map(col => {
        let val = formatValue(col, item[col]);
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${feature}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = (item) => setSelectedItem(item);
  const closeDetail = () => setSelectedItem(null);

  const openAddForm = () => {
    setEditItem(null);
    const initial = {};
    config.fields.forEach(f => { initial[f.key] = f.type === 'checkbox' ? false : ''; });
    setFormData(initial);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditItem(item);
    const initial = {};
    config.fields.forEach(f => {
      let val = item[f.key];
      if (f.type === 'date' && val) val = val.split('T')[0];
      if (f.type === 'checkbox') val = !!val;
      initial[f.key] = val ?? '';
    });
    setFormData(initial);
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleFormChange = (key, value, type) => {
    setFormData(prev => ({ ...prev, [key]: type === 'checkbox' ? value : value }));
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await API.put(`${config.endpoint}/${editItem.id}`, formData);
      } else {
        await API.post(config.endpoint, formData);
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item[config.nameField]}"?`)) return;
    try {
      await API.delete(`${config.endpoint}/${item.id}`);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      alert('Error deleting');
    }
  };

  const handleQuickToggle = async (item, field) => {
    try {
      const updated = { ...item, [field]: !item[field] };
      await API.put(`${config.endpoint}/${item.id}`, updated);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await API.get('/dashboard/checklist-templates');
      setTemplates(res.data);
      setShowTemplates(true);
    } catch (err) {
      alert('Failed to load templates');
    }
  };

  const applyTemplate = async (template) => {
    if (!window.confirm(`Add ${template.tasks.length} tasks from "${template.name}"? This won't remove existing tasks.`)) return;
    try {
      for (const task of template.tasks) {
        await API.post(config.endpoint, {
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          completed: false,
          due_date: null,
        });
      }
      setShowTemplates(false);
      fetchData();
    } catch (err) {
      alert('Error applying template');
    }
  };

  const summary = config.summaryRow ? config.summaryRow(filteredData) : null;

  return (
    <div>
      <div className="feature-page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
          <h1>{config.icon} {config.title}</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddForm}>+ Add New</button>
          {config.showTemplates && (
            <button className="btn btn-outline" onClick={loadTemplates}>📋 Templates</button>
          )}
          <button className="btn btn-outline" onClick={exportCSV}>📥 Export CSV</button>
          {['vendors', 'budget', 'timeline', 'seating', 'menu', 'music', 'florals', 'invitations'].includes(feature) && (
            <button className="btn btn-secondary" onClick={() => navigate('/ai-assistant')}>🤖 AI Assist</button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder={`Search ${config.title.toLowerCase()}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
        {config.filterColumn && filterOptions.length > 0 && (
          <select className="filter-select" value={filterValue} onChange={e => setFilterValue(e.target.value)}>
            <option value="">All {config.columnLabels[config.columns.indexOf(config.filterColumn)] || 'Categories'}</option>
            {filterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
        <span className="result-count">{filteredData.length} item{filteredData.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading...</p></div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">{config.icon}</span>
          <h3>No items yet</h3>
          <p>Click "Add New" to get started{config.showTemplates ? ' or use a template' : ''}</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                {config.columnLabels.map((label, i) => (
                  <th key={i} onClick={() => handleSort(config.columns[i])} className="sortable-th">
                    {label}
                    {sortColumn === config.columns[i] && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                    )}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className={config.rowClass ? config.rowClass(item) : ''}
                >
                  {config.columns.map((col, i) => {
                    const statusClass = getStatusClass(col, item[col]);
                    const isToggleable = ['completed', 'paid', 'selected', 'purchased', 'pinned'].includes(col);
                    return (
                      <td key={i}>
                        {isToggleable ? (
                          <span
                            className={`status-badge ${statusClass} clickable-badge`}
                            onClick={e => { e.stopPropagation(); handleQuickToggle(item, col); }}
                            title="Click to toggle"
                          >
                            {formatValue(col, item[col])}
                          </span>
                        ) : statusClass ? (
                          <span className={`status-badge ${statusClass}`}>{formatValue(col, item[col])}</span>
                        ) : formatValue(col, item[col])}
                      </td>
                    );
                  })}
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-outline btn-sm" style={{ marginRight: 6 }} onClick={() => openEditForm(item)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}>Delete</button>
                  </td>
                </tr>
              ))}
              {summary && (
                <tr className="summary-row">
                  {config.columns.map((col, i) => (
                    <td key={i} style={{ fontWeight: 600 }}>{summary[col] || ''}</td>
                  ))}
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{config.icon} {selectedItem[config.nameField]}</h2>
              <button className="modal-close" onClick={closeDetail}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {config.fields.map(f => (
                  <div key={f.key} className={`detail-item ${f.type === 'textarea' ? 'full-width' : ''}`}>
                    <div className="detail-label">{f.label}</div>
                    <div className="detail-value">{formatValue(f.key, selectedItem[f.key])}</div>
                  </div>
                ))}
                {selectedItem.created_at && (
                  <div className="detail-item">
                    <div className="detail-label">Created</div>
                    <div className="detail-value">{new Date(selectedItem.created_at).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => openEditForm(selectedItem)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedItem)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay form-modal" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit' : 'Add New'} {config.title}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {config.fields.map(f => {
                if (f.type === 'checkbox') {
                  return (
                    <div key={f.key} className="checkbox-group" style={{ marginBottom: 16 }}>
                      <input type="checkbox" checked={!!formData[f.key]} onChange={e => handleFormChange(f.key, e.target.checked, 'checkbox')} />
                      <label>{f.label}</label>
                    </div>
                  );
                }
                return (
                  <div key={f.key} className="form-group">
                    <label>{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={formData[f.key] || ''} onChange={e => handleFormChange(f.key, e.target.value)}>
                        <option value="">Select...</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={formData[f.key] || ''} onChange={e => handleFormChange(f.key, e.target.value)} />
                    ) : (
                      <input
                        type={f.type}
                        value={formData[f.key] || ''}
                        onChange={e => handleFormChange(f.key, e.target.value)}
                        required={f.required}
                        step={f.step}
                        min={f.min}
                        max={f.max}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Templates Modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>📋 Checklist Templates</h2>
              <button className="modal-close" onClick={() => setShowTemplates(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20, color: 'var(--text-light)' }}>Choose a template to add pre-built wedding planning tasks. Existing tasks won't be affected.</p>
              {templates.map((t, i) => (
                <div key={i} className="template-card">
                  <div className="template-header">
                    <h3>{t.name}</h3>
                    <span className="template-count">{t.tasks.length} tasks</span>
                  </div>
                  <p className="template-desc">{t.description}</p>
                  <div className="template-preview">
                    {t.tasks.slice(0, 5).map((task, j) => (
                      <div key={j} className="template-task-preview">
                        <span className={`priority-dot priority-${task.priority}`}></span>
                        {task.title}
                      </div>
                    ))}
                    {t.tasks.length > 5 && <div className="template-task-preview" style={{ color: 'var(--text-muted)' }}>...and {t.tasks.length - 5} more</div>}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => applyTemplate(t)} style={{ marginTop: 12 }}>
                    Use This Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeaturePage;
