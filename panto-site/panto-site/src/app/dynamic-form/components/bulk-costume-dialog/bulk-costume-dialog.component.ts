import { Component } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { Guid } from 'guid-typescript';
import { CostumeFilters, CostumeModel, CostumeSizeModel } from '../../../costume-list-container/models/costume';
import { CostumeService } from '../../../costume-list-container/services/costume-service';

interface BulkCostumeRow {
    catalogueNo: string;
    description: string;
    type: string;
    colours: string[];
    sizes: string;
    notes: string;
    imageName: string;
    imageUploading: boolean;
    imageError: string;
}

@Component({
    selector: 'app-bulk-costume-dialog',
    templateUrl: './bulk-costume-dialog.component.html',
    styleUrls: ['./bulk-costume-dialog.component.css'],
})
export class BulkCostumeDialogComponent {
    rows: BulkCostumeRow[] = Array.from({ length: 5 }, () => this.emptyRow());
    isSaving = false;
    errorMessage = '';
    colourOptions: { key: string; value: string }[];
    typeOptions: { key: string; value: string }[];

    constructor(
        private dialogRef: MatDialogRef<BulkCostumeDialogComponent>,
        private costumeService: CostumeService,
        @Inject(MAT_DIALOG_DATA) data: { filterOptions: CostumeFilters }
    ) {
        this.colourOptions = data.filterOptions.colours.map((colour) => ({
            key: colour.label,
            value: colour.label,
        }));
        this.typeOptions = data.filterOptions.types.map((type) => ({
            key: type.label,
            value: type.label,
        }));
    }

    get completedRows(): BulkCostumeRow[] {
        return this.rows.filter((row) =>
            [row.catalogueNo, row.description, row.type, row.sizes, row.notes, row.imageName]
                .some((value) => value.trim()) || row.colours.length > 0
        );
    }

    get hasUploadingImages(): boolean {
        return this.rows.some((row) => row.imageUploading);
    }

    addRow(): void {
        if (this.rows.length < 500) {
            this.rows.push(this.emptyRow());
        }
    }

    removeRow(index: number): void {
        if (this.rows.length > 1) {
            this.rows.splice(index, 1);
        }
    }

    imageUploaded(row: BulkCostumeRow, imageName: string): void {
        row.imageName = imageName;
        row.imageError = '';
    }

    imageUploadStateChanged(row: BulkCostumeRow, uploading: boolean): void {
        row.imageUploading = uploading;
        if (uploading) {
            row.imageError = '';
        }
    }

    coloursSelected(row: BulkCostumeRow, colours: string[] | null): void {
        row.colours = colours ?? [];
    }

    typeSelected(row: BulkCostumeRow, type: string | null): void {
        row.type = type ?? '';
    }

    async save(): Promise<void> {
        this.errorMessage = '';
        const rows = this.completedRows;
        if (rows.length === 0) {
            this.errorMessage = 'Enter at least one costume.';
            return;
        }

        const incomplete = rows.find(
            (row) => !row.catalogueNo.trim() || !row.description.trim() || !row.type.trim()
        );
        if (incomplete) {
            this.errorMessage = 'Each costume needs a catalogue number, description, and type.';
            return;
        }

        const catalogueNumbers = rows.map((row) => row.catalogueNo.trim());
        if (new Set(catalogueNumbers).size !== catalogueNumbers.length) {
            this.errorMessage = 'Catalogue numbers must be unique within this batch.';
            return;
        }

        const parsedRows: CostumeModel[] = [];
        for (const row of rows) {
            const quantity = this.parseSizes(row.sizes);
            if (!quantity) {
                this.errorMessage = `Check the size format for catalogue number ${row.catalogueNo}. Use formats like S:2, M:1.`;
                return;
            }

            parsedRows.push({
                catalogueNo: row.catalogueNo.trim(),
                description: row.description.trim(),
                type: row.type.trim(),
                colours: row.colours,
                imageName: row.imageName,
                notes: row.notes.trim(),
                quantity,
                folder: '',
                sortableCatNo: this.costumeService.getSortableCatNo(
                    row.catalogueNo.trim()
                ),
            });
        }

        this.isSaving = true;
        try {
            await this.costumeService.createCostumes(parsedRows);
            this.dialogRef.close(true);
        } catch {
            this.errorMessage = 'Could not save the costumes. Please try again.';
            this.isSaving = false;
        }
    }

    cancel(): void {
        this.dialogRef.close(false);
    }

    private parseSizes(value: string): CostumeSizeModel[] | null {
        if (!value.trim()) {
            return [];
        }

        const sizes: CostumeSizeModel[] = [];
        for (const item of value.split(',')) {
            const match = item.trim().match(/^(.+?)\s*:\s*(\d+)$/);
            if (!match || !match[1].trim()) {
                return null;
            }
            const count = Number(match[2]);
            if (!Number.isSafeInteger(count) || count < 1 || sizes.length + count > 5000) {
                return null;
            }
            for (let index = 0; index < count; index++) {
                sizes.push({
                    id: Guid.create().toString(),
                    name: match[1].trim(),
                    checkedOutBy: '',
                });
            }
        }
        return sizes;
    }

    private emptyRow(): BulkCostumeRow {
        return {
            catalogueNo: '',
            description: '',
            type: '',
            colours: [],
            sizes: '',
            notes: '',
            imageName: '',
            imageUploading: false,
            imageError: '',
        };
    }
}
