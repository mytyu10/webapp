import { IsString, MinLength, MaxLength } from 'class-validator';

export class AccountDto {
    @IsString()
    @MaxLength(10)
    readonly username: string;

    @IsString()
    @MinLength(8)
    @MaxLength(20)
    readonly password: string;
}