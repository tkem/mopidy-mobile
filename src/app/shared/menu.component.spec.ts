import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PopoverController } from '@ionic/angular/standalone';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { click, dispatch, flush, textsOf } from '../../testing/dom';
import { MenuComponent, MenuItem } from './menu.component';

describe('MenuComponent', () => {
  let fixture: ComponentFixture<MenuComponent>;
  let popover: { dismiss: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    popover = { dismiss: vi.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [MenuComponent],
      providers: [{ provide: PopoverController, useValue: popover }],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuComponent);
  });

  function render(items: MenuItem[]): HTMLElement {
    fixture.componentInstance.items = items;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders translated labels, with an ellipsis for dialog items', () => {
    const el = render([{ text: 'Play now' }, { text: 'Add to playlist', hellip: true }]);
    expect(textsOf(el, 'ion-label')).toEqual(['Play now', 'Add to playlist…']);
  });

  it('skips hidden items', () => {
    const el = render([{ text: 'Play now' }, { text: 'Share', hidden: true }, { text: 'Clear' }]);
    expect(textsOf(el, 'ion-label')).toEqual(['Play now', 'Clear']);
  });

  it('disables items', () => {
    const el = render([{ text: 'Play now', disabled: true }, { text: 'Clear' }]);
    const items = Array.from(el.querySelectorAll('ion-item')) as (HTMLElement & { disabled?: boolean })[];
    expect(items[0].disabled).toBe(true);
    expect(items[1].disabled).toBe(false);
  });

  it('dismisses the popover before running the item handler', async () => {
    const order: string[] = [];
    popover.dismiss.mockImplementation(() => {
      order.push('dismiss');
      return Promise.resolve(true);
    });
    const el = render([{ text: 'Play now', handler: () => order.push('handler') }]);
    click(el.querySelector('ion-item'));
    await flush();
    expect(order).toEqual(['dismiss', 'handler']);
  });

  it('dismisses the popover for items without a handler', async () => {
    const el = render([{ text: 'Cancel' }]);
    click(el.querySelector('ion-item'));
    await flush();
    expect(popover.dismiss).toHaveBeenCalledTimes(1);
  });

  it('renders checkbox items and reports toggles without dismissing', () => {
    const toggle = vi.fn();
    const item: MenuItem = { text: 'Sort by name', checked: false, toggle };
    const el = render([item]);
    const checkbox = el.querySelector('ion-checkbox');
    expect(checkbox).not.toBeNull();
    dispatch(checkbox, 'ionChange', { checked: true, value: 'on' });
    expect(toggle).toHaveBeenCalledWith(true);
    expect(item.checked).toBe(true);
    expect(popover.dismiss).not.toHaveBeenCalled();
  });
});
