"""Commands for persistent, ordered translation processes."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

WorkflowType = Literal['tep', 'mtpe', 'localization', 'documentary', 'subtitling']


class WorkflowAssignment(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    templateId: WorkflowType
    reviewerId: str | None = Field(default=None, min_length=1, max_length=160)


class StageUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    action: Literal['complete', 'block', 'resume']
    expectedRevision: int = Field(ge=1, strict=True)
    note: str = Field(default='', max_length=2000)

    @model_validator(mode='after')
    def reason_for_block(self):
        if self.action == 'block' and not self.note:
            raise ValueError('Descreva o motivo do bloqueio.')
        return self
