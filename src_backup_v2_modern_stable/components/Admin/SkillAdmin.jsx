import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ArrowUp, ArrowDown, Save } from 'lucide-react';

/**
 * CategoryAdmin is a reusable component for managing lists of categories with colors.
 * It supports:
 * - Skills: Full CRUD (Add, Rename, Delete, Reorder, Color)
 * - Areas: Restricted (Reorder, Color only)
 */
const CategoryAdmin = ({ 
  items = [],       // Array of strings (for skills) or objects { id, name } (for areas)
  groupColors = {}, 
  employees = [], 
  onSave, 
  palette = [],
  title = "Bereiche verwalten",
  type = "skills",  // "skills" or "areas"
  canEdit = true    // Whether items can be added/deleted/renamed
}) => {
  const [editingEmployees, setEditingEmployees] = useState(employees);
  const [editingItems, setEditingItems] = useState(items);
  const [editingColors, setEditingColors] = useState(groupColors || {});
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    setEditingItems(items);
  }, [items]);

  useEffect(() => {
    setEditingColors(groupColors || {});
  }, [groupColors]);

  const getIdentifier = (item) => typeof item === 'object' ? item.id : item;
  const getName = (item) => typeof item === 'object' ? item.name : item;

  const getItemColor = (item, index) => {
    const id = getIdentifier(item);
    if (editingColors[id]) return editingColors[id];
    if (palette.length > 0) return palette[index % palette.length];
    return '#64748b';
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    const name = newItem.trim();
    if (editingItems.some(i => getName(i).toLowerCase() === name.toLowerCase())) return alert('Name existiert bereits!');
    
    if (type === 'skills') {
      const id = `skill_${Date.now()}`;
      setEditingItems([...editingItems, { id, name }]);
    } else {
      // Areas shouldn't be added manually usually, but if so:
      setEditingItems([...editingItems, name]);
    }
    setNewItem('');
  };

  const handleDeleteItem = (item) => {
    const id = getIdentifier(item);
    if (confirm(`"${getName(item)}" wirklich löschen? Dies entfernt den Eintrag überall.`)) {
      setEditingItems(editingItems.filter(i => getIdentifier(i) !== id));
      if (type === 'skills') {
        setEditingEmployees(editingEmployees.map(emp => ({
          ...emp,
          groups: Array.isArray(emp.groups) ? emp.groups.filter(g => g !== id) : []
        })));
      }
    }
  };

  const handleMove = (index, direction) => {
    const newItems = [...editingItems];
    if (direction === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setEditingItems(newItems);
  };

  const handleRename = (item, newName) => {
    const name = newName.trim();
    if (!name || getName(item) === name) return;
    if (editingItems.some(i => getName(i).toLowerCase() === name.toLowerCase() && getIdentifier(i) !== getIdentifier(item))) {
      return alert('Name existiert bereits!');
    }

    setEditingItems(editingItems.map(i => {
      if (getIdentifier(i) === getIdentifier(item)) {
        return typeof i === 'object' ? { ...i, name } : name;
      }
      return i;
    }));
    
    // NO NEED to cascade to employees or colors anymore because the ID stays the same!
  };

  const handleColorChange = (item, color) => {
    setEditingColors({ ...editingColors, [getIdentifier(item)]: color });
  };

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '100px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
        <button 
          onClick={() => {
            const finalColors = { ...editingColors };
            editingItems.forEach((item, i) => {
              const id = getIdentifier(item);
              if (!finalColors[id]) finalColors[id] = getItemColor(item, i);
            });
            
            const payload = { groupColors: finalColors };
            if (type === 'skills') {
              payload.skills = editingItems;
              payload.employees = editingEmployees;
            } else {
              payload.areaOrder = editingItems.map(i => getIdentifier(i));
            }
            onSave(payload);
          }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
            background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Save size={16} /> Speichern
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Add New (Only if editable) */}
        {canEdit && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input 
              type="text" 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Neu hinzufügen..."
              style={{ 
                flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                fontSize: '0.875rem'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <button 
              onClick={handleAddItem}
              style={{ 
                padding: '10px 20px', background: 'white', border: '1px solid var(--border)', borderRadius: '6px',
                display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Hinzufügen
            </button>
          </div>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {editingItems.map((item, index) => (
            <div 
              key={getIdentifier(item)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'
              }}
            >
              <input 
                type="color" 
                value={getItemColor(item, index)}
                onChange={(e) => handleColorChange(item, e.target.value)}
                style={{ width: '32px', height: '32px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}
              />
              
              {canEdit ? (
                <input 
                  type="text" 
                  defaultValue={getName(item)}
                  onBlur={(e) => handleRename(item, e.target.value)}
                  style={{ 
                    flex: 1, padding: '6px', border: '1px solid transparent', background: 'transparent',
                    fontWeight: 700, fontSize: '0.9rem', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.background = 'white'}
                  onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
                />
              ) : (
                <div style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {getName(item)}
                </div>
              )}

              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  style={{ padding: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}
                >
                  <ArrowUp size={16} />
                </button>
                <button 
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === editingItems.length - 1}
                  style={{ padding: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: index === editingItems.length - 1 ? 'default' : 'pointer', opacity: index === editingItems.length - 1 ? 0.3 : 1 }}
                >
                   <ArrowDown size={16} />
                </button>
                {canEdit && (
                  <button 
                    onClick={() => handleDeleteItem(item)}
                    style={{ padding: '6px', background: '#fee2e2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryAdmin;
