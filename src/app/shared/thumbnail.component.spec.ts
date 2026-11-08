import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Image } from '../models';
import { ThumbnailComponent } from './thumbnail.component';

@Component({
  imports: [ThumbnailComponent],
  template: `<app-thumbnail [image]="image()" [type]="type()" />`,
})
class HostComponent {
  readonly image = signal<Image | null>(null);
  readonly type = signal<'album' | 'artist' | 'directory' | 'track'>('track');
}

describe('ThumbnailComponent', () => {
  it('shows a typed placeholder without an image', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type.set('album');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.placeholder')?.classList.contains('album')).toBe(true);
  });

  it('shows the image when available', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.image.set({ uri: 'http://example.com/cover.jpg', width: 64, height: 64 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector('img');
    expect(img?.getAttribute('src')).toBe('http://example.com/cover.jpg');
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(el.querySelector('.placeholder')).toBeNull();
  });

  it('switches back to the placeholder when the image is removed', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.image.set({ uri: 'http://example.com/cover.jpg' });
    fixture.detectChanges();
    fixture.componentInstance.image.set(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.placeholder.track')).not.toBeNull();
  });
});
