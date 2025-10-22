
import { JobFile, Charge } from '../types';

// In a real app, use a proper hashing library. This is for simulation.
export const simpleHash = (password: string): string => {
    let hash = 0;
    if (password.length === 0) return hash.toString();
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
};


// A robust function to normalize data from a JSON file into a valid JobFile object
export const normalizeJobData = (data: any): JobFile => {
    // Basic validation
    if (!data || (typeof data.id !== 'string' && typeof data.jfn !== 'string')) {
        throw new Error('Invalid job file data: missing id or jfn.');
    }

    const normalizeDate = (date: any): string => {
        if (!date) return new Date().toISOString();
        // Handle Firestore-like timestamp objects
        if (typeof date === 'object' && date.seconds) {
            return new Date(date.seconds * 1000).toISOString();
        }
        // Handle string dates
        if (typeof date === 'string') {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString();
            }
        }
        return new Date().toISOString();
    };

    const charges: Charge[] = Array.isArray(data.ch) ? data.ch.map((c: any) => ({
        l: c.l || c.description || '',
        c: String(c.c || c.cost || '0'),
        s: String(c.s || c.selling || '0'),
        n: c.n || c.notes || '',
    })) : [];

    const totalCost = charges.reduce((sum, c) => sum + (parseFloat(c.c) || 0), 0);
    const totalSelling = charges.reduce((sum, c) => sum + (parseFloat(c.s) || 0), 0);
    const totalProfit = totalSelling - totalCost;

    const normalized: JobFile = {
        id: data.id || data.jfn.replace(/\//g, '_'),
        jfn: data.jfn || data.id,
        d: normalizeDate(data.d || data.date).split('T')[0],
        billingDate: data.billingDate ? normalizeDate(data.billingDate).split('T')[0] : '',
        po: data.po || '',
        cl: Array.isArray(data.cl) ? data.cl : [],
        pt: Array.isArray(data.pt) ? data.pt : [],
        in: data.in || '',
        bd: data.bd ? normalizeDate(data.bd).split('T')[0] : '',
        sm: data.sm || '',
        sh: data.sh || '',
        co: data.co || '',
        mawb: data.mawb || '',
        hawb: data.hawb || '',
        ts: data.ts || '',
        or: data.or || '',
        pc: String(data.pc || ''),
        gw: String(data.gw || ''),
        de: data.de || '',
        vw: String(data.vw || ''),
        dsc: data.dsc || '',
        ca: data.ca || '',
        tn: data.tn || '',
        vn: data.vn || '',
        fv: data.fv || '',
        cn: data.cn || '',
        ch: charges,
        re: data.re || '',
        pb: data.pb || data.preparedBy || '',
        status: data.status || 'pending',
        totalCost,
        totalSelling,
        totalProfit,
        createdBy: data.createdBy || '',
        createdAt: data.createdAt ? normalizeDate(data.createdAt) : new Date().toISOString(),
        lastUpdatedBy: data.lastUpdatedBy || data.createdBy || '',
        updatedAt: data.updatedAt ? normalizeDate(data.updatedAt) : new Date().toISOString(),
        checkedBy: data.checkedBy || null,
        checkedAt: data.checkedAt ? normalizeDate(data.checkedAt) : null,
        approvedBy: data.approvedBy || null,
        approvedAt: data.approvedAt ? normalizeDate(data.approvedAt) : null,
        rejectedBy: data.rejectedBy || null,
        rejectedAt: data.rejectedAt ? normalizeDate(data.rejectedAt) : null,
        rejectionReason: data.rejectionReason || null,
    };

    return normalized;
};