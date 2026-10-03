import { Injectable } from '@angular/core';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    DocumentData,
    endBefore,
    getDoc,
    getDocs,
    getDocsFromCache,
    getFirestore,
    limit,
    limitToLast,
    onSnapshot,
    orderBy,
    Query,
    query,
    setDoc,
    startAfter,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import {
    Costume,
    CostumeFilters,
    CostumeModel,
    FilterItem,
    normalizeCostumeQuantity,
} from '../models/costume';
import { BehaviorSubject } from 'rxjs';

//const COSTUME_COLLECTION = 'costumes-dev';
const COSTUME_COLLECTION = 'costumes';

@Injectable()
export class CostumeService {
    private imageUrlCache = new Map<string, Promise<string>>();
    private firstVisible!: any;
    private lastVisible!: any;
    public firstPage: boolean = false;
    public lastPage: boolean = false;
    private absoluteFirstId: string = '';

    private filters$: BehaviorSubject<CostumeFilters> = new BehaviorSubject(
        new CostumeFilters()
    );
    private costumeDescriptions$: BehaviorSubject<string[]> =
        new BehaviorSubject<string[]>([]);

    private pendingRefresh$: BehaviorSubject<number> = new BehaviorSubject(0);

    private isLoading$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    constructor() {}

    async getCostumes(
        filters?: CostumeFilters,
        next?: boolean,
        prev?: boolean,
        isInit?: boolean
    ): Promise<Costume[]> {
        const costumes: Costume[] = [];

        this.setLoadingStatus(true);

        const db = getFirestore();
        const ref = collection(db, COSTUME_COLLECTION);
        const queryConstraints = [];

        if (filters && filters.colours.length > 0) {
            queryConstraints.push(
                where(
                    'colours',
                    'array-contains-any',
                    filters.colours.map((c) => c.label)
                )
            );
        }

        if (filters && filters.types.length > 0) {
            queryConstraints.push(
                where(
                    'type',
                    'in',
                    filters.types.map((t) => t.label)
                )
            );
        }

        if (filters && filters.folders.length > 0) {
            queryConstraints.push(
                where('folder', '==', filters.folders[0].label)
            );
        }

        if (isInit) {
            this.setCostumeFilters();
            this.addSnapshotListener();
        }

        let q: any;
        if ((!next && !prev) || (!this.firstVisible && !this.lastVisible)) {
            q = query(
                ref,
                ...queryConstraints,
                orderBy('sortableCatNo'),
                limit(9)
            );
        } else if (next) {
            q = query(
                ref,
                ...queryConstraints,
                orderBy('sortableCatNo'),
                startAfter(this.lastVisible),
                limit(9)
            );
        } else if (prev) {
            q = query(
                ref,
                ...queryConstraints,
                orderBy('sortableCatNo'),
                endBefore(this.firstVisible),
                limitToLast(8)
            );
        }

        const querySnapshot = await this.tryGetDocsFromCache(q);

        this.firstVisible = querySnapshot.docs[0];
        this.lastVisible =
            querySnapshot.docs[
                querySnapshot.docs.length === 9
                    ? 7
                    : querySnapshot.docs.length - 1
            ];

        this.checkPages(querySnapshot.docs.length, next, prev);

        let index = 0;
        querySnapshot.forEach(async (doc) => {
            if (index === 8) {
                return;
            }
            const costumeModel = doc.data() as CostumeModel;

            const costume = new Costume(costumeModel, doc.id);
            if (index === 0 && !next && !prev) {
                this.absoluteFirstId = costume.id;
            }
            if (index === 0 && this.absoluteFirstId === costume.id) {
                this.firstPage = true;
            }
            index++;
            costume.imageUrl = await this.getImageUrl(costumeModel.imageName);
            costumes.push(costume);
            costumes.sort((a, b) =>
                CostumeService.sortBySplitChar(
                    a.catalogueNo.toString(),
                    b.catalogueNo.toString(),
                    '.'
                )
            );
        });

        this.setLoadingStatus(false);

        return costumes;
    }

    async getAllCostumes(): Promise<Costume[]> {
        const db = getFirestore();
        const q = query(collection(db, COSTUME_COLLECTION));
        const querySnapshot = await getDocs(q);
        const costumes = querySnapshot.docs.map((costumeDoc) => {
                const costumeModel = costumeDoc.data() as CostumeModel;
                return new Costume(costumeModel, costumeDoc.id);
            });

        return costumes.sort((a, b) =>
            CostumeService.sortBySplitChar(
                a.catalogueNo.toString(),
                b.catalogueNo.toString(),
                '.'
            )
        );
    }

    private addSnapshotListener(): void {
        const db = getFirestore();
        const q = query(collection(db, COSTUME_COLLECTION));

        onSnapshot(q, { includeMetadataChanges: false }, (snapshot: any) => {
            snapshot.docChanges().forEach((change: any) => {
                if (!snapshot.metadata.fromCache) {
                    console.log(`Costume ${change.type}:`, change.doc.data());

                    const source = snapshot.metadata.fromCache
                        ? 'local cache'
                        : 'server';
                    console.log('Data came from ' + source);

                    this.setPendingRefresh(this.pendingRefresh$.getValue() + 1);
                }
            });
        });
    }

    private checkPages(length: number, next?: boolean, prev?: boolean): void {
        if (next) {
            this.lastPage = length > 0 && length < 9;
            this.firstPage = false;
        } else if (prev) {
            this.lastPage = false;
            this.firstPage = false;
        } else {
            this.lastPage = length > 0 && length < 9;
            this.firstPage = true;
        }
    }

    async getCostumesWithLocalFilters(
        filters?: CostumeFilters,
        next?: boolean,
        prev?: boolean
    ): Promise<Costume[]> {
        let costumes: Costume[] = [];

        const db = getFirestore();
        const ref = collection(db, COSTUME_COLLECTION);
        const queryConstraints = [];

        if (filters && filters.colours.length > 0) {
            queryConstraints.push(
                where(
                    'colours',
                    'array-contains-any',
                    filters.colours.map((c) => c.label)
                )
            );
        }

        if (filters && filters.types.length > 0) {
            queryConstraints.push(
                where(
                    'type',
                    'in',
                    filters.types.map((t) => t.label)
                )
            );
        }

        if (filters && filters.folders.length > 0) {
            queryConstraints.push(
                where('folder', '==', filters.folders[0].label)
            );
        }

        const q = query(ref, ...queryConstraints, orderBy('sortableCatNo'));
        let querySnapshot = await this.tryGetDocsFromCache(q);

        querySnapshot.forEach((doc) => {
            const costumeModel = doc.data() as CostumeModel;
            if (
                this.costumeMatchesFilteredSize(costumeModel, filters) ||
                (filters?.description !== '' &&
                    costumeModel.description
                        .toLowerCase()
                        .includes(filters?.description.toLowerCase() ?? ''))
            ) {
                const costume = new Costume(costumeModel, doc.id);
                costumes.sort((a, b) =>
                    CostumeService.sortBySplitChar(
                        a.catalogueNo.toString(),
                        b.catalogueNo.toString(),
                        '.'
                    )
                );
                costumes.push(costume);
            }
        });

        if (next) {
            const lastVisibleIndex = costumes.findIndex(
                (x) => x.id === this.lastVisible.id
            );
            costumes = costumes.slice(
                lastVisibleIndex + 1,
                lastVisibleIndex + 9
            );
        } else if (prev) {
            const firstVisibleIndex = costumes.findIndex(
                (x) => x.id === this.firstVisible.id
            );
            if (firstVisibleIndex - 8 > -1) {
                costumes = costumes.slice(
                    firstVisibleIndex - 8,
                    firstVisibleIndex
                );
            } else {
                costumes = costumes.slice(0, 8);
            }
        } else {
            costumes = costumes.slice(0, 9);
        }

        this.checkPages(costumes.length, next, prev);

        const trimmedCostumes: Costume[] = [];
        costumes.forEach(async (costume, index) => {
            if (index === 8) {
                return;
            }

            this.getImageUrl(costume.imageName).then((url) => {
                costume.imageUrl = url;

                trimmedCostumes.push(costume);
                trimmedCostumes.sort((a, b) =>
                    CostumeService.sortBySplitChar(
                        a.catalogueNo.toString(),
                        b.catalogueNo.toString(),
                        '.'
                    )
                );

                if (index === 0) {
                    this.firstVisible = costume;
                    if (!next && !prev) {
                        this.absoluteFirstId = costume.id;
                    }
                    if (this.absoluteFirstId === costume.id) {
                        this.firstPage = true;
                    }
                } else if (index === 7) {
                    this.lastVisible = costume;
                }
            });
        });

        this.setLoadingStatus(false);

        return trimmedCostumes;
    }

    private async tryGetDocsFromCache(q: Query<DocumentData>) {
        let querySnapshot;
        try {
            querySnapshot = await getDocsFromCache(q);
            if (querySnapshot.empty) {
                querySnapshot = await getDocs(q);
                console.log('Data came from server');
            } else {
                console.log('Data came from local cache');
            }
        } catch (e) {
            querySnapshot = await getDocs(q);
            console.log('Data came from server');
        }
        return querySnapshot;
    }

    private costumeMatchesFilteredSize(
        costume: CostumeModel,
        filters?: CostumeFilters
    ): boolean {
        if (!filters || filters.sizes.length === 0) {
            if (filters?.description !== '') {
                return false;
            }
            return true;
        }

        const filteredBySize: string[] = [];
        normalizeCostumeQuantity(costume.quantity).forEach((x) => {
            if (filters.sizes.map((s) => s.label).includes(x.name)) {
                filteredBySize.push(x.name);
                return;
            }
        });

        if (filteredBySize.length === 0) {
            return false;
        }

        return true;
    }

    public getPendingRefresh(): BehaviorSubject<number> {
        return this.pendingRefresh$;
    }

    public setPendingRefresh(changedItems: number): void {
        this.pendingRefresh$.next(changedItems);
    }

    public getLoadingStatus(): BehaviorSubject<boolean> {
        return this.isLoading$;
    }

    public setLoadingStatus(isLoading: boolean): void {
        this.isLoading$.next(isLoading);
    }

    public getCostumeFilters(): BehaviorSubject<CostumeFilters> {
        return this.filters$;
    }

    public getCostumeDescriptions(): BehaviorSubject<string[]> {
        return this.costumeDescriptions$;
    }

    private async setCostumeFilters(): Promise<void> {
        const filters: CostumeFilters = new CostumeFilters();

        const db = getFirestore();
        const q = query(collection(db, COSTUME_COLLECTION));
        const querySnapshot = await this.tryGetDocsFromCache(q);
        const descriptions = new Set<string>();

        filters.folders.push({ label: 'All', count: 0 });

        querySnapshot.forEach(async (doc) => {
            const costumeModel = doc.data() as CostumeModel;
            if (typeof costumeModel.description === 'string') {
                descriptions.add(costumeModel.description.trim());
            }

            for (const colour of costumeModel.colours) {
                const colourIndex = filters.colours.findIndex(
                    (x) => x.label === colour
                );
                if (colourIndex === -1) {
                    filters.colours.push({ label: colour, count: 1 });
                } else {
                    filters.colours[colourIndex].count++;
                }
            }

            const typeIndex = filters.types.findIndex(
                (x) => x.label === costumeModel.type
            );
            if (typeIndex === -1) {
                filters.types.push({ label: costumeModel.type, count: 1 });
            } else {
                filters.types[typeIndex].count++;
            }

            this.populateFolders(filters, costumeModel);

            for (const size of costumeModel.quantity) {
                const sizeIndex = filters.sizes.findIndex(
                    (x) => x.label === size.name
                );
                if (sizeIndex === -1) {
                    filters.sizes.push({ label: size.name, count: 1 });
                } else {
                    filters.sizes[sizeIndex].count++;
                }
            }
        });

        filters.sizes.sort(this.sortSizes);
        filters.types.sort((a, b) => (a.label > b.label ? 1 : -1));

        this.costumeDescriptions$.next(
            Array.from(descriptions).filter(Boolean).sort((a, b) =>
                a.localeCompare(b)
            )
        );
        this.filters$.next(filters);
    }

    private populateFolders(
        filters: CostumeFilters,
        costumeModel: CostumeModel
    ) {
        const allFolderItem = filters.folders.find((x) => x.label === 'All');
        if (!allFolderItem) {
            filters.folders.push({ label: 'All', count: 1 });
        } else {
            allFolderItem.count++;
        }

        const folderName = !!costumeModel.folder ? costumeModel.folder : 'All';
        const folderItem = filters.folders.find((x) => x.label === folderName);
        if (folderName !== 'All') {
            if (!folderItem) {
                filters.folders.push({ label: folderName, count: 1 });
            } else {
                folderItem.count++;
            }
        }
    }

    private sortSizes(a: FilterItem, b: FilterItem): number {
        if (a.label.includes('-') && b.label.includes('-')) {
            return CostumeService.sortBySplitChar(a.label, b.label, '-');
        }

        if (a.label.includes('-') && !b.label.includes('-')) {
            return -1;
        }

        if (b.label.includes('-') && !a.label.includes('-')) {
            return 1;
        }

        return CostumeService.sortBySplitChar(a.label, b.label, '"');
    }

    private static sortBySplitChar(
        a: string,
        b: string,
        splitByChar: string
    ): number {
        const nameA1 = Number(a.substring(0, a.indexOf(splitByChar)));
        const nameB1 = Number(b.substring(0, b.indexOf(splitByChar)));

        if (nameA1 < nameB1) {
            return -1;
        }

        if (nameA1 > nameB1) {
            return 1;
        }

        if (splitByChar === '"') {
            return 0;
        }

        const nameA2 = Number(
            a.substring(a.indexOf(splitByChar) + 1, a.length)
        );
        const nameB2 = Number(
            b.substring(b.indexOf(splitByChar) + 1, b.length)
        );

        if (nameA2 < nameB2) {
            return -1;
        }

        if (nameA2 > nameB2) {
            return 1;
        }

        return 0;
    }

    async getImageUrl(fileName: string): Promise<string> {
        if (fileName === '') {
            return '';
        }

        let imageUrlRequest = this.imageUrlCache.get(fileName);
        if (!imageUrlRequest) {
            imageUrlRequest = getDownloadURL(
                ref(getStorage(), `costumes/${fileName}`)
            ).catch((reason: any) => {
                console.log(`error: ${reason}`);
                return '';
            });
            this.imageUrlCache.set(fileName, imageUrlRequest);
        }

        return imageUrlRequest;
    }

    async createCostume(costume: CostumeModel) {
        const db = getFirestore();
        const costumesRef = collection(db, COSTUME_COLLECTION);
        const docRef = await addDoc(costumesRef, costume);
        //const docRef = await setDoc(doc(db, COSTUME_COLLECTION), costume);
    }

    async createCostumes(costumes: CostumeModel[]): Promise<void> {
        if (costumes.length > 500) {
            throw new Error('Firestore batches are limited to 500 writes.');
        }

        const db = getFirestore();
        const costumesRef = collection(db, COSTUME_COLLECTION);
        const batch = writeBatch(db);
        for (const costume of costumes) {
            batch.set(doc(costumesRef), costume);
        }
        await batch.commit();
    }

    async updateFolder(costumeId: string, folder: string): Promise<void> {
        const db = getFirestore();
        const costumeToUpdateDoc = doc(db, COSTUME_COLLECTION, costumeId);
        const costumeToUpdateData = await getDoc(costumeToUpdateDoc);
        const costumeToUpdate = costumeToUpdateData.data() as CostumeModel;

        costumeToUpdate.folder = folder;

        await updateDoc(costumeToUpdateDoc, {
            folder: costumeToUpdate.folder,
        });
    }

    async updateCostumeImage(
        costumeId: string,
        imageName: string
    ): Promise<void> {
        await updateDoc(doc(getFirestore(), COSTUME_COLLECTION, costumeId), {
            imageName,
        });
    }

    async updateCostumeSizes(
        costumeId: string,
        checkedOutSizeIds: string[],
        checkedOutBy: string
    ): Promise<void> {
        const db = getFirestore();
        const costumeToUpdateDoc = doc(db, COSTUME_COLLECTION, costumeId);
        const costumeToUpdateData = await getDoc(costumeToUpdateDoc);
        const costumeToUpdate = costumeToUpdateData.data() as CostumeModel;

        const quantity = normalizeCostumeQuantity(costumeToUpdate.quantity);
        quantity.forEach((size) => {
            if (checkedOutSizeIds.includes(size.id)) {
                size.checkedOutBy = checkedOutBy;
            }
        });

        await updateDoc(costumeToUpdateDoc, {
            quantity,
        });
    }

    async deleteCostume(costumeId: string): Promise<void> {
        const db = getFirestore();
        await deleteDoc(doc(db, COSTUME_COLLECTION, costumeId));
    }

    async editCostume(id: string, costume: CostumeModel): Promise<void> {
        const db = getFirestore();
        await setDoc(doc(db, COSTUME_COLLECTION, id), {
            catalogueNo: costume.catalogueNo,
            colours: costume.colours,
            description: costume.description,
            imageName: costume.imageName,
            notes: costume.notes,
            quantity: costume.quantity,
            type: costume.type,
            folder: costume.folder ?? '',
            sortableCatNo: this.getSortableCatNo(costume.catalogueNo),
        });
    }

    public getSortableCatNo(catalogueNo: string): number {
        const splitNo = catalogueNo.toString().split('.');
        const splitNo1 = Number(splitNo[0]);
        const splitNo2 = Number(splitNo[1]) / 10000;
        const sortableString = splitNo1 + splitNo2;

        const sortableCatNo = Number(sortableString);

        return sortableCatNo;
    }
}
