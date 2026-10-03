import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgxImageCompressService } from 'ngx-image-compress';
import { FileUpload } from './models/file-upload.model';
import { FileUploadService } from './services/file-upload.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
})
export class FileUploadComponent implements OnInit {
  @Input() compact = false;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Output()
  public uploaded: EventEmitter<any> = new EventEmitter<any>();
  @Output()
  public uploadState: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output()
  public uploadFailed: EventEmitter<void> = new EventEmitter<void>();

  selectedFiles?: FileList;
  currentFileUpload?: FileUpload;

  file?: any;
  isUploading = false;

  constructor(
    private uploadService: FileUploadService,
    private imageCompress: NgxImageCompressService
  ) {}

  ngOnInit(): void {}

  public openFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  private _emitChange(): void {
    this.uploaded.emit(this.currentFileUpload?.name);
  }

  public selectFile(event: any): void {
    const file = event.target.files?.[0] as File | undefined;
    if (!file) {
      return;
    }

    this.file = file;
    this.isUploading = true;
    this.uploadState.emit(true);
    const reader = new FileReader();
    reader.onload = async (readerEvent: any) => {
      try {
        await this.compressFile(readerEvent.target.result, file.name);
      } catch {
        this.uploadFailed.emit();
      } finally {
        this.isUploading = false;
        this.uploadState.emit(false);
      }
    };
    reader.onerror = () => {
      this.uploadFailed.emit();
      this.isUploading = false;
      this.uploadState.emit(false);
    };
    reader.readAsDataURL(file);
  }

  private async compressFile(image: string, fileName: string): Promise<void> {
    const result = await this.imageCompress.compressFile(image, -1, 50, 50);
    const imageFile = new File([result], fileName, { type: 'image/jpeg' });
    await this.uploadFile(imageFile, result);
  }

  private async uploadFile(file: File, message: string): Promise<void> {
    this.currentFileUpload = new FileUpload(file);
    this.currentFileUpload.url = await this.uploadService.pushFileToStorage(
      this.currentFileUpload,
      message
    );
    this._emitChange();
  }
}
