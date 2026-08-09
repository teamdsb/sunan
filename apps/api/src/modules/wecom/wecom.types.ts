export interface WecomUserInfoResponse {
  UserId?: string;
  userid?: string;
  user_ticket?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WecomUserSensitiveDetailResponse {
  userid: string;
  avatar?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WecomUserDetailResponse {
  userid: string;
  name: string;
  avatar?: string;
  department?: number[];
  position?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WecomDepartment {
  id: number;
  name: string;
}

export interface WecomDepartmentListResponse {
  department: WecomDepartment[];
  errcode?: number;
  errmsg?: string;
}

export interface WecomTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

export interface WecomTicketResponse {
  ticket: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

export interface WecomMediaResponse {
  buffer: Buffer;
  contentType: string;
}

export interface WecomApprovalTemplateCreateRequest {
  template_name: Array<{
    text: string;
    lang: 'zh_CN';
  }>;
  template_content: {
    controls: Array<{
      property: {
        control: 'Text' | 'Textarea' | 'Number' | 'Date';
        id: string;
        title: Array<{
          text: string;
          lang: 'zh_CN';
        }>;
        placeholder: Array<{
          text: string;
          lang: 'zh_CN';
        }>;
        require: 0 | 1;
        un_print: 0 | 1;
      };
      config: Record<string, unknown>;
    }>;
  };
}

export interface WecomApprovalTemplateCreateResponse {
  template_id: string;
  errcode?: number;
  errmsg?: string;
}

export interface WecomOpenApprovalDataResponse {
  data?: {
    ThirdNo?: string;
    OpenTemplateId?: string;
    OpenSpName?: string;
    OpenSpstatus?: number;
    OpenSpStatus?: number;
    ApplyTime?: number;
    ApplyUsername?: string;
    ApplyUserId?: string;
    [key: string]: unknown;
  };
  errcode?: number;
  errmsg?: string;
}
