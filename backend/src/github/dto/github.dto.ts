import { IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** GitHub リポジトリ追加 DTO */
export class AddGitHubRepoDto {
  @ApiProperty({
    description: 'リポジトリオーナー名',
    example: 'octocat',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'owner は英数字・ハイフン・アンダースコア・ドットのみ使用できます',
  })
  readonly owner: string;

  @ApiProperty({
    description: 'リポジトリ名',
    example: 'hello-world',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'repo は英数字・ハイフン・アンダースコア・ドットのみ使用できます',
  })
  readonly repo: string;
}

/** GitHub リポジトリレスポンス DTO */
export interface GitHubRepoResponseDto {
  id: number;
  owner: string;
  repo: string;
}

/** GitHub Issue レスポンス DTO */
export interface GitHubIssueResponseDto {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  owner: string;
  repo: string;
  created_at: string;
  updated_at: string;
  user_login: string;
}

/** GitHub 連携状態レスポンス DTO */
export interface GitHubStatusResponseDto {
  connected: boolean;
}
