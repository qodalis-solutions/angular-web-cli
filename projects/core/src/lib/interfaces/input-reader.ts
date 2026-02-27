/**
 * Represents an option for the readSelect prompt.
 */
export interface CliSelectOption {
    /** Display text shown to the user */
    label: string;
    /** Value returned when this option is selected */
    value: string;
}

/**
 * Provides interactive input reading from the terminal.
 * All methods resolve with `null` when the user aborts (Ctrl+C or Escape).
 */
export interface ICliInputReader {
    /**
     * Prompt the user for a line of text input.
     * @param prompt The prompt text to display (e.g. "Enter your name: ")
     * @returns The entered text, empty string if Enter pressed with no input, or null if aborted
     */
    readLine(prompt: string): Promise<string | null>;

    /**
     * Prompt the user for password input. Characters are masked with asterisks.
     * @param prompt The prompt text to display (e.g. "Password: ")
     * @returns The entered password, empty string if Enter pressed with no input, or null if aborted
     */
    readPassword(prompt: string): Promise<string | null>;

    /**
     * Prompt the user for a yes/no confirmation.
     * @param prompt The prompt text to display (e.g. "Continue?")
     * @param defaultValue The default value when Enter is pressed without input (defaults to false)
     * @returns true for yes, false for no, defaultValue on empty Enter, or null if aborted
     */
    readConfirm(prompt: string, defaultValue?: boolean): Promise<boolean | null>;

    /**
     * Prompt the user to select from a list of options using arrow keys.
     * @param prompt The prompt text to display (e.g. "Pick one:")
     * @param options The list of options to choose from
     * @returns The value of the selected option, or null if aborted
     */
    readSelect(prompt: string, options: CliSelectOption[]): Promise<string | null>;
}
