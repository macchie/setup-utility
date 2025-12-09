import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScheduledTasksPage } from './scheduled-tasks.page';

describe('ScheduledTasksPage', () => {
  let component: ScheduledTasksPage;
  let fixture: ComponentFixture<ScheduledTasksPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ScheduledTasksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
