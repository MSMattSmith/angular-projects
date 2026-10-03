import { Component, Inject, OnInit } from '@angular/core';
import {
    Costume,
    CostumeFilters,
} from 'src/app/costume-list-container/models/costume';
import { CostumeService } from 'src/app/costume-list-container/services/costume-service';
import { QuestionBase } from '../../models/question-base';
import { QuestionService } from '../../services/question-service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-dynamic-form-dialog',
    templateUrl: './dynamic-form-dialog.component.html',
    styleUrls: ['./dynamic-form-dialog.component.css'],
    providers: [QuestionService, CostumeService],
})
export class DynamicFormDialogComponent implements OnInit {
    public questions: QuestionBase<any>[] = [];
    public loaded = false;
    public isChangingImage = false;
    public imageChangeError = '';

    constructor(
        public dialogRef: MatDialogRef<DynamicFormDialogComponent>,
        private questionService: QuestionService,
        private costumeService: CostumeService,
        @Inject(MAT_DIALOG_DATA)
        public data?: { costumeToEdit: Costume; filterOptions: CostumeFilters }
    ) {
        this.questions = this.questionService.getQuestions([], []);
    }

    ngOnInit(): void {
        this.setUpQuestions();
        this.loaded = true;
    }

    public async imageUploaded(imageName: string): Promise<void> {
        const costume = this.data?.costumeToEdit;
        if (!costume || !imageName) {
            return;
        }

        this.isChangingImage = true;
        this.imageChangeError = '';
        try {
            await this.costumeService.updateCostumeImage(
                costume.id,
                imageName
            );
            costume.imageName = imageName;
            costume.imageUrl = await this.costumeService.getImageUrl(imageName);
        } catch {
            this.imageChangeError = 'Could not save the replacement image.';
        } finally {
            this.isChangingImage = false;
        }
    }

    private setUpQuestions(): void {
        if (!this.data) {
            return;
        }

        const costumeColours = this.data.filterOptions.colours.map((colour) => {
            return { key: colour.label, value: colour.label };
        });

        const costumeTypes = this.data.filterOptions.types.map((type) => {
            return { key: type.label, value: type.label };
        });

        this.questions = this.questionService.getQuestions(
            costumeColours,
            costumeTypes,
            this.data?.costumeToEdit
        );
    }
}
