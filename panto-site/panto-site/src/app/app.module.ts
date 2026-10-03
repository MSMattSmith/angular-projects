import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { environment } from '../environments/environment';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore } from '@angular/fire/firestore';
import { provideStorage } from '@angular/fire/storage';

import { AppComponent } from './app.component';
import { DynamicFormComponent } from './dynamic-form/dynamic-form.component';
import { DynamicFormQuestionComponent } from './dynamic-form/components/dynamic-form-question/dynamic-form-question.component';
import { TopNavComponent } from './top-nav/top-nav.component';
import { CostumeListContainerComponent } from './costume-list-container/costume-list-container.component';
import { CostumeService } from './costume-list-container/services/costume-service';
import { MatIconModule } from '@angular/material/icon';
import { CostumeFiltersComponent } from './costume-filters/costume-filters.component';
import { DynamicFormDialogComponent } from './dynamic-form/components/dynamic-form-dialog/dynamic-form-dialog.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DualInputGroupComponent } from './dynamic-form/components/dual-input-group/dual-input-group.component';
import { InputDropdownComponent } from './dynamic-form/components/input-dropdown/input-dropdown.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { FileUploadService } from './file-upload/services/file-upload.service';
import { DotsMenuComponent } from './costume-list-container/components/dots-menu/dots-menu.component';
import { CheckOutDialogComponent } from './costume-list-container/components/check-out-dialog/check-out-dialog.component';
import { CheckInDialogComponent } from './costume-list-container/components/check-in-dialog/check-in-dialog.component';
import { DeleteDialogComponent } from './costume-list-container/components/delete-dialog/delete-dialog.component';
import { LargeImageDialogComponent } from './costume-list-container/components/large-image-dialog/large-image-dialog.component';
import { NgxImageCompressService } from 'ngx-image-compress';
import { FolderDialogComponent } from './costume-list-container/components/folder-dialog/folder-dialog.component';
import { CostumePrintPreviewComponent } from './costume-list-container/components/costume-print-preview/costume-print-preview.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@NgModule({
    imports: [
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideFirestore(() => getFirestore()),
        provideStorage(() => getStorage()),
        BrowserModule,
        ReactiveFormsModule,
        MatIconModule,
        MatDialogModule,
        BrowserAnimationsModule,
        FormsModule,
        MatProgressSpinnerModule,
    ],
    declarations: [
        AppComponent,
        DynamicFormComponent,
        DynamicFormQuestionComponent,
        TopNavComponent,
        CostumeListContainerComponent,
        CostumeFiltersComponent,
        DynamicFormDialogComponent,
        DualInputGroupComponent,
        InputDropdownComponent,
        FileUploadComponent,
        DotsMenuComponent,
        CheckOutDialogComponent,
        CheckInDialogComponent,
        DeleteDialogComponent,
        LargeImageDialogComponent,
        FolderDialogComponent,
        CostumePrintPreviewComponent,
    ],
    providers: [CostumeService, FileUploadService, NgxImageCompressService],
    bootstrap: [AppComponent],
})
export class AppModule {
    constructor() {}
}
