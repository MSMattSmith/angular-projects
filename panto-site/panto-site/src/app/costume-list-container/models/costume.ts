export interface CostumeModel {
    catalogueNo: string;
    colours: string[];
    description: string;
    imageName: string;
    notes: string;
    quantity: CostumeSizeModel[];
    type: string;
    folder: string;
    sortableCatNo?: number;
}

export function normalizeCostumeColours(colours: unknown): string[] {
    if (Array.isArray(colours)) {
        return colours.filter((colour): colour is string => typeof colour === 'string');
    }
    if (typeof colours === 'string') {
        return [colours];
    }
    if (colours && typeof colours === 'object') {
        const entries = Object.entries(colours as Record<string, unknown>);
        const values = entries
            .map(([, value]) => value)
            .filter((colour): colour is string => typeof colour === 'string');
        return values.length > 0
            ? values
            : entries.filter(([, value]) => Boolean(value)).map(([name]) => name);
    }
    return [];
}

export function normalizeCostumeQuantity(quantity: unknown): CostumeSizeModel[] {
    let entries: Array<{ value: unknown; key: string }>;

    if (Array.isArray(quantity)) {
        entries = quantity.map((value, index) => ({ value, key: `${index}` }));
    } else if (quantity && typeof quantity === 'object') {
        const value = quantity as Record<string, unknown>;
        if ('name' in value) {
            entries = [{ value, key: '0' }];
        } else {
            entries = Object.entries(value).flatMap(([key, item]) => {
                if (Array.isArray(item)) {
                    return item.map((value) => ({ value, key }));
                }
                if (typeof item === 'number' && Number.isFinite(item)) {
                    return Array.from(
                        { length: Math.max(0, Math.floor(item)) },
                        (_, index) => ({ value: { name: key }, key: `${key}-${index}` })
                    );
                }
                return [{ value: item, key }];
            });
        }
    } else {
        entries = [];
    }

    return entries.flatMap(({ value, key }) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [];
        }

        const size = value as Record<string, unknown>;
        const name = typeof size['name'] === 'string' ? size['name'] : key;
        if (!name) {
            return [];
        }

        return [{
            id: typeof size['id'] === 'string' ? size['id'] : key,
            name,
            checkedOutBy:
                typeof size['checkedOutBy'] === 'string'
                    ? size['checkedOutBy']
                    : '',
        }];
    });
}

export class Costume {
    id!: string;
    catalogueNo!: string;
    colours!: string[];
    description!: string;
    imageUrl!: string;
    imageName!: string;
    notes!: string;
    quantity!: CostumeSize[];
    uniqueSizes!: CostumeSizeModel[];
    count!: number;
    checkedOutCount!: number;
    checkedOutBy!: string[];
    folder!: string;
    type!: string;
    sortableCatNo?: number;

    constructor(costume: CostumeModel, id: string) {
        this.id = id;
        this.catalogueNo = costume.catalogueNo;
        this.colours = normalizeCostumeColours(costume.colours);
        this.description = costume.description;
        this.imageUrl = '';
        this.imageName = costume.imageName;
        this.notes = costume.notes;
        const quantity = normalizeCostumeQuantity(costume.quantity);
        this.quantity = this.setupQuantity(quantity);
        this.uniqueSizes = quantity;
        this.count = quantity.length;
        this.checkedOutCount = quantity.filter(
            (size) => size.checkedOutBy !== ''
        ).length;
        this.checkedOutBy = quantity
            .filter((size) => size.checkedOutBy !== '')
            .map((size) => size.checkedOutBy);
        this.folder = costume.folder;
        this.type = costume.type;
        this.sortableCatNo = costume.sortableCatNo;
    }

    private setupQuantity(quantity: CostumeSizeModel[]): CostumeSize[] {
        const sizes: CostumeSize[] = [];
        quantity.forEach((q) => {
            const size = {
                id: q.id,
                name: q.name,
                count: quantity.filter((x) => x.name === q.name).length,
                checkedOutBy: q.checkedOutBy,
            };
            if (sizes.filter((x) => x.name === size.name).length === 0) {
                sizes.push(size);
            }
        });
        return sizes;
    }
}

export class CostumeFilters {
    description!: string;
    colours!: FilterItem[];
    types!: FilterItem[];
    sizes!: FilterItem[];
    folders!: FilterItem[];

    constructor() {
        this.description = '';
        this.colours = [];
        this.types = [];
        this.sizes = [];
        this.folders = [];
    }
}

export interface CostumeSizeModel {
    id: string;
    name: string;
    checkedOutBy: string;
}
export interface CostumeSize {
    id: string;
    name: string;
    count: number;
    checkedOutBy: string;
}

export interface FilterItem {
    label: string;
    count: number;
}
