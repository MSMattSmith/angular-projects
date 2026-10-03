import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Costume } from '../../models/costume';
import { CostumeService } from '../../services/costume-service';

@Component({
    selector: 'app-costume-print-preview',
    templateUrl: './costume-print-preview.component.html',
    styleUrls: ['./costume-print-preview.component.css'],
})
export class CostumePrintPreviewComponent implements OnInit {
    @Output() closed = new EventEmitter<void>();

    costumes: Costume[] = [];
    pages: Costume[][] = [];
    isLoading = true;
    imagesLoading = false;
    isPreparingPrint = false;
    errorMessage = '';
    private imagesPromise: Promise<void> = Promise.resolve();

    constructor(private costumeService: CostumeService) {}

    async ngOnInit(): Promise<void> {
        try {
            this.costumes = await this.costumeService.getAllCostumes();
            this.pages = this.createPages(this.costumes, 30);
            this.isLoading = false;
            this.imagesLoading = true;
            this.imagesPromise = Promise.all(
                this.costumes.map(async (costume) => {
                    costume.imageUrl = await this.costumeService.getImageUrl(
                        costume.imageName
                    );
                })
            ).then(() => {
                this.imagesLoading = false;
            });
        } catch {
            this.isLoading = false;
            this.errorMessage = 'Could not load the costume catalogue.';
        }
    }

    getPrintableSizes(costume: Costume): string {
        return costume.quantity
            .map((size) => `${size.count} x ${size.name}`)
            .join(', ');
    }

    private createPages(costumes: Costume[], pageSize: number): Costume[][] {
        const pages: Costume[][] = [];
        for (let index = 0; index < costumes.length; index += pageSize) {
            pages.push(costumes.slice(index, index + pageSize));
        }
        return pages;
    }

    close(): void {
        this.closed.emit();
    }

    async print(): Promise<void> {
        this.isPreparingPrint = true;
        try {
            await this.imagesPromise;
            const images = Array.from(
                document.querySelectorAll<HTMLImageElement>(
                    'app-costume-print-preview .print-preview-sheet img'
                )
            );
            await Promise.all(
                images.map((image) => image.decode().catch(() => undefined))
            );
            window.print();
        } finally {
            this.isPreparingPrint = false;
        }
    }
}
