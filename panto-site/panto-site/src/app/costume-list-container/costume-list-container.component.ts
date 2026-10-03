import { Component, OnInit, Input } from '@angular/core';
import { CostumeService } from './services/costume-service';
import { Costume, CostumeFilters, FilterItem } from './models/costume';
import { CheckOutDialogComponent } from './components/check-out-dialog/check-out-dialog.component';
import { LargeImageDialogComponent } from './components/large-image-dialog/large-image-dialog.component';
import { getBgColour } from '../helpers/costume-helper';
import { MatDialog } from '@angular/material/dialog';

@Component({
    selector: 'app-costume-list-container',
    templateUrl: './costume-list-container.component.html',
    styleUrls: ['./costume-list-container.component.css'],
})
export class CostumeListContainerComponent implements OnInit {
    costumes: Costume[] = [];
    rawCostumes: Costume[] = [];
    isPreparingPrint: boolean = false;
    showPrintPreview: boolean = false;
    checkOutHover: string = '';
    imagesOnly: boolean = false;
    filters!: CostumeFilters;

    @Input()
    filterOptions: CostumeFilters = new CostumeFilters();
    @Input()
    colours: string[] = [];

    constructor(
        public costumeService: CostumeService,
        public dialog: MatDialog
    ) {}

    async ngOnInit(): Promise<void> {
        this.costumes = await this.costumeService.getCostumes(
            undefined,
            false,
            false,
            true
        );
        this.rawCostumes = Object.assign(this.costumes);
    }

    public async folderSelected(folder: FilterItem): Promise<void> {
        if (this.folderAlreadySelected(folder)) {
            return;
        }

        this.filters = new CostumeFilters();
        if (folder.label === 'All') {
            this.filters.folders = [];
        } else {
            this.filters.folders = [folder];
        }
        await this.filterChanged(this.filters);
    }

    private folderAlreadySelected(folder: FilterItem) {
        return (
            this.filters &&
            ((this.filters.folders.length === 0 && folder.label === 'All') ||
                (this.filters.folders.length > 0 &&
                    this.filters.folders[0].label === folder.label))
        );
    }

    public async filterChanged(filters: CostumeFilters): Promise<void> {
        this.filters = filters;
        //if (filters.description !== '' && filters.colours.length === 0 && filters.sizes.length === 0 && filters.types.length === 0) {
        if (filters.description !== '' || filters.sizes.length > 0) {
            //this.costumes = this.rawCostumes.filter(costume => costume.description.toLowerCase().includes(filters.description.toLowerCase()));
            this.costumes =
                await this.costumeService.getCostumesWithLocalFilters(filters);
        } else {
            this.costumes = await this.costumeService.getCostumes(filters);
        }
    }

    public openCheckOutDialog(costume: Costume): void {
        this.dialog.open(CheckOutDialogComponent, {
            width: '500px',
            data: {
                costume: costume,
            },
        });
    }

    public openLargeImage(costume: Costume): void {
        this.dialog.open(LargeImageDialogComponent, {
            width: '500px',
            data: {
                costume: costume,
                filterOptions: this.filterOptions,
            },
        });
    }

    public localGetBgColour(colour: string): string {
        return getBgColour(colour);
    }

    public async printAllCostumes(): Promise<void> {
        this.isPreparingPrint = true;
        try {
            this.showPrintPreview = true;
        } finally {
            this.isPreparingPrint = false;
        }
    }

    public closePrintPreview(): void {
        this.showPrintPreview = false;
    }

    public async nextPage(): Promise<void> {
        if (
            this.filters &&
            (this.filters.description !== '' || this.filters.sizes.length > 0)
        ) {
            this.costumes =
                await this.costumeService.getCostumesWithLocalFilters(
                    this.filters,
                    true,
                    false
                );
        } else {
            this.costumes = await this.costumeService.getCostumes(
                this.filters,
                true,
                false
            );
        }
    }

    public async prevPage(): Promise<void> {
        if (
            this.filters &&
            (this.filters.description !== '' || this.filters.sizes.length > 0)
        ) {
            this.costumes =
                await this.costumeService.getCostumesWithLocalFilters(
                    this.filters,
                    false,
                    true
                );
        } else {
            this.costumes = await this.costumeService.getCostumes(
                this.filters,
                false,
                true
            );
        }
    }
}
