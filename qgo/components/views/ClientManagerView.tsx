import React, { useState, useEffect } from 'react';
import { Client } from '../../types';

interface ClientManagerViewProps {
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    onDelete: (client: Client) => void;
    showNotification: (message: string, isError?: boolean) => void;
}

const BLANK_CLIENT: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = { name: '', address: '', contactPerson: '', phone: '', type: 'Shipper' };

const ClientManagerView: React.FC<ClientManagerViewProps> = ({ clients, setClients, onDelete, showNotification }) => {
    const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleFieldChange = (updates: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>) => {
        setEditingClient(prev => ({
            ...(prev || {}),
            ...updates,
        }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const clientDataToSave = editingClient || BLANK_CLIENT;
        if (!clientDataToSave || !clientDataToSave.name) return;

        const now = new Date().toISOString();
        const isUpdate = editingClient && editingClient.id;

        if (isUpdate) { // Update
            setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...editingClient, updatedAt: now } as Client : c));
        } else { // Create
            const newClient: Client = {
                id: `client-${Date.now()}`,
                name: clientDataToSave.name,
                address: clientDataToSave.address || '',
                contactPerson: clientDataToSave.contactPerson || '',
                phone: clientDataToSave.phone || '',
                type: clientDataToSave.type || 'Shipper',
                createdAt: now,
                updatedAt: now,
            };
            setClients(prev => [...prev, newClient]);
        }
        showNotification(`Client '${clientDataToSave.name}' saved successfully.`);
        setEditingClient(null);
    };

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const formTitle = editingClient?.id ? 'Edit Client' : 'Add New Client';
    const clientData = editingClient || BLANK_CLIENT;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 card">
                <h4 className="text-xl font-semibold mb-4">{formTitle}</h4>
                <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label>Client Name</label>
                        <input type="text" value={clientData.name || ''} onChange={e => handleFieldChange({ name: e.target.value })} className="input-field mt-1" required />
                    </div>
                    <div>
                        <label>Address</label>
                        <textarea value={clientData.address || ''} onChange={e => handleFieldChange({ address: e.target.value })} rows={2} className="input-field mt-1"></textarea>
                    </div>
                    <div>
                        <label>Contact Person</label>
                        <input type="text" value={clientData.contactPerson || ''} onChange={e => handleFieldChange({ contactPerson: e.target.value })} className="input-field mt-1" />
                    </div>
                    <div>
                        <label>Phone</label>
                        <input type="text" value={clientData.phone || ''} onChange={e => handleFieldChange({ phone: e.target.value })} className="input-field mt-1" />
                    </div>
                    <div>
                        <label>Client Type</label>
                        <select value={clientData.type || 'Shipper'} onChange={e => handleFieldChange({ type: e.target.value as Client['type'] })} className="input-field mt-1">
                            <option value="Shipper">Shipper</option>
                            <option value="Consignee">Consignee</option>
                            <option value="Both">Both</option>
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <button type="submit" className="w-full btn btn-primary">Save Client</button>
                        <button type="button" onClick={() => setEditingClient(null)} className="w-full btn btn-secondary">Clear</button>
                    </div>
                </form>
            </div>
            <div className="md:col-span-2 card">
                <h4 className="text-xl font-semibold mb-4">Existing Clients</h4>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field mb-4" placeholder="Search clients..." />
                <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                    {filteredClients.map(client => (
                        <div key={client.id} className="border p-3 rounded-lg bg-slate-50 hover:bg-slate-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-slate-800">{client.name}</p>
                                    <p className="text-sm">{client.address}</p>
                                </div>
                                <div className="flex-shrink-0 space-x-2">
                                    <button onClick={() => setEditingClient(client)} className="text-xs btn bg-blue-500 hover:bg-blue-600 text-white py-1 px-2">Edit</button>
                                    <button onClick={() => onDelete(client)} className="text-xs btn btn-danger py-1 px-2">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ClientManagerView;
