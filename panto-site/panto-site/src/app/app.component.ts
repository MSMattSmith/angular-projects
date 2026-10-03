import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CostumeListContainerComponent } from './costume-list-container/costume-list-container.component';
import { CostumeFilters } from './costume-list-container/models/costume';
import { DynamicFormDialogComponent } from './dynamic-form/components/dynamic-form-dialog/dynamic-form-dialog.component';
import { BulkCostumeDialogComponent } from './dynamic-form/components/bulk-costume-dialog/bulk-costume-dialog.component';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentSingleTabManager,
} from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { initializeApp } from 'firebase/app';
import { MatDialog } from '@angular/material/dialog';
import { CostumeService } from './costume-list-container/services/costume-service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @ViewChild('costumeListContainer', { static: true })
    costumeListContainer!: CostumeListContainerComponent;

    mobileFilterVisible: boolean = false;
    filterOptions: CostumeFilters = new CostumeFilters();
    pendingRefresh: number = 0;

    constructor(
        public dialog: MatDialog,
        private costumeService: CostumeService
    ) {}

    ngOnInit(): void {
        const app = initializeApp(environment.firebase);
        initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentSingleTabManager({}),
            }),
        });

        this._subscription.add(
            this.costumeService
                .getCostumeFilters()
                .subscribe((costumeFilters: CostumeFilters) => {
                    this.filterOptions = costumeFilters;
                })
        );

        this._subscription.add(
            this.costumeService
                .getPendingRefresh()
                .subscribe((changedItems: number) => {
                    this.pendingRefresh = changedItems;
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    public filterChanged(event: {
        filters: CostumeFilters;
        closePanel?: boolean;
    }) {
        if (event.closePanel) {
            this.mobileFilterVisible = false;
        }
        this.costumeListContainer.filterChanged(event.filters);
    }

    public toggleForm(): void {
        this.dialog.open(DynamicFormDialogComponent, {
            width: '500px',
            data: {
                filterOptions: this.filterOptions,
            },
        });
    }

    public openBulkForm(): void {
        this.dialog
            .open(BulkCostumeDialogComponent, {
                width: 'min(1200px, 96vw)',
                maxWidth: '96vw',
                data: { filterOptions: this.filterOptions },
            })
            .afterClosed()
            .subscribe((saved: boolean) => {
                if (saved) {
                    window.location.reload();
                }
            });
    }
}
