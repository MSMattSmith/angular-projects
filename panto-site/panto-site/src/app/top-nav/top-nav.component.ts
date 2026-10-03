import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';

@Component({
    selector: 'app-top-nav',
    templateUrl: './top-nav.component.html',
    styleUrls: ['./top-nav.component.css'],
})
export class TopNavComponent implements OnInit {
    @Input()
    pendingRefresh: number = 0;
    @Output()
    addNew: EventEmitter<void> = new EventEmitter();
    @Output()
    addBulk: EventEmitter<void> = new EventEmitter();
    @Output()
    openFilter: EventEmitter<void> = new EventEmitter();

    logoUrl: string = '';

    constructor() {}

    async ngOnInit(): Promise<void> {
        this.logoUrl = await this.getLogoUrl();
    }

    public async getLogoUrl(): Promise<string> {
        let imageUrl = '';
        const storage = getStorage();
        const storageRef = ref(storage, `icons/EP-small.png`);

        await getDownloadURL(storageRef).then((url: string) => {
            imageUrl = url;
        });

        return imageUrl;
    }

    public refreshData(): void {
        window.location.reload();
    }
}
