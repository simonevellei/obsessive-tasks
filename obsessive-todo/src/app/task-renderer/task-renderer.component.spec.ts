import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskRendererComponent } from './task-renderer.component';

describe('TaskRendererComponent', () => {
  let component: TaskRendererComponent;
  let fixture: ComponentFixture<TaskRendererComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TaskRendererComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
