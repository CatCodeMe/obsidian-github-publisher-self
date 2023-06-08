import {App, Notice, Modal, Setting} from "obsidian";
import { FolderSettings, GitHubPublisherSettings, RegexReplace, TextCleaner, TypeOfEditRegex } from "../interface";
import i18next from "i18next";

export class ModalRegexFilePathName extends Modal {
	settings: GitHubPublisherSettings;
	allRegex: RegexReplace[];
	onSubmit: (result: RegexReplace[]) => void;
	constructor(
		app: App, 
		settings: GitHubPublisherSettings, 
		allRegex : RegexReplace[],
		onSubmit: (result: RegexReplace[]) => void) {
		super(app);
		this.allRegex = allRegex;
		this.settings = settings;
		this.onSubmit = onSubmit;
	}

	classValue(allRegex: RegexReplace[]) {
		this.settings.upload.replacePath = allRegex.filter((regex) => {
			return regex.type === TypeOfEditRegex.path;
		});
		this.settings.upload.replaceTitle = allRegex.filter((regex) => {
			return regex.type === TypeOfEditRegex.title;
		}
		);
	}

	forbiddenValue(value: string, type: TypeOfEditRegex): (string|boolean)[] {
		let onWhat = type === TypeOfEditRegex.path ? i18next.t("common.path.folder") : i18next.t("common.path.file");
		onWhat = onWhat.toLowerCase();
		let isForbidden = false;
		if (value == "/") {
			new Notice(i18next.t("settings.regexReplacing.forbiddenValue", {what: onWhat, forbiddenChar: value}));
			value = "";
			isForbidden = true;
		}
		else if (
			(value.match(/[><:"|?*]|(\\\/)|(^\w+\/\w+)|(\\)/)) && (type === TypeOfEditRegex.title)
		) {
			new Notice(i18next.t("settings.regexReplacing.forbiddenValue", {what: onWhat, forbiddenChar: value.match(/[><:"|?*]|(\\\/)|(^\w+\/\w+)|(\\)/)[0]}));
			value = "";
			isForbidden = true;
		} else if (type === TypeOfEditRegex.path) {
			if (value.match(/[\\><:"|?*]/)){
				new Notice(i18next.t("settings.regexReplacing.forbiddenValue", { what: onWhat, forbiddenChar: value.match(/[\\><:"|?*]/)[0]}));
				value = "";
				isForbidden = true;
			} else if (value.match(/(^\w+\/\w+)|(\\\/)/)) {
				new Notice(i18next.t("settings.regexReplacing.warningPath"));
			}
		}
		return [value, isForbidden];
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		if (this.settings.upload.behavior === FolderSettings.fixed) {
			contentEl.createEl("h2", { text: i18next.t("settings.regexReplacing.modal.title.only")});
		} else {
			contentEl.createEl("h2", { text: i18next.t("settings.regexReplacing.modal.title.all")});
		}
		if (!this.settings.upload.replacePath) {
			this.settings.upload.replacePath = [];
		}
		else if (!this.settings.upload.replaceTitle) {
			this.settings.upload.replaceTitle = [];
		}
		this.settings.upload.replacePath.forEach((title) => {
			if (!title.type) {
				title.type = TypeOfEditRegex.path;
			}
		});
		this.settings.upload.replaceTitle.forEach((title) => {
			if (!title.type) {
				title.type = TypeOfEditRegex.title;
			}	
		});

		for (const title of this.allRegex) {
			const sett = new Setting(contentEl)
				.setClass("github-publisher-censor-entry")
				.addText((text) => {
					text.inputEl.style.width = "100%";
					text.setPlaceholder(i18next.t("regex.entry"))
						.setValue(title.regex)
						.onChange((value) => {
							title.regex = value;
						});
				})
				.addText((text) => {
					text.inputEl.style.width = "100%";
					text.setPlaceholder(i18next.t("regex.replace"))
						.setValue(title.replacement)
						.onChange((value) => {
							title.replacement = value;
						});
				});

			if (this.settings.upload.behavior !== FolderSettings.fixed) {
				sett.addDropdown((dropdown) => {
					dropdown
						.addOption("path", i18next.t("common.path.folder"))
						.addOption("title", i18next.t("common.path.file"))
						.setValue(title.type)
						.onChange((value) => {
							title.type = value as TypeOfEditRegex;

						});
				});
			} else {
				sett
					.addButton((button) => {
						button.buttonEl.classList.add("github-publisher-disabled-button");
						button.setButtonText(i18next.t("common.path.file"));
					});
			}
			sett.addExtraButton((button) => {
				button
					.setIcon("trash")
					.onClick(() => {
						//remove replace 
						this.allRegex.splice(this.allRegex.indexOf(title), 1);
						this.onOpen();
					});
			});
		}
		new Setting(contentEl)
			.setClass("github-publisher-modals")
			.addButton((button) => {
				button
					.setIcon("plus")
					.onClick(() => {
						this.allRegex.push({
							regex: "",
							replacement: "",
							type: TypeOfEditRegex.title
						});
						this.onOpen();
					});
			})
			.addButton((button) => {
				button
					.setButtonText(i18next.t("common.save"))
					.onClick(() => {
						const canBeValidated: boolean[] = [];
						this.allRegex.forEach((title) => {
							const isForbiddenEntry = this.forbiddenValue(title.regex, title.type);
							const isForbiddenReplace = this.forbiddenValue(title.replacement, title.type);
							canBeValidated.push(isForbiddenEntry[1] as boolean);
							canBeValidated.push(isForbiddenReplace[1] as boolean);
							if (isForbiddenEntry[1] || isForbiddenReplace[1]) {
								title.regex = isForbiddenEntry[0] as string;
								title.replacement = isForbiddenReplace[0] as string;
							}
						});
						if (!canBeValidated.includes(true)) {
							this.onSubmit(this.allRegex);
							this.close();
						}
					});
			});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export class ModalRegexOnContents extends Modal {
	settings: GitHubPublisherSettings;
	onSubmit: (settings: GitHubPublisherSettings) => void;
	constructor(
		app: App, 
		settings: GitHubPublisherSettings, 
		onSubmit: (settings: GitHubPublisherSettings) => void) {
		super(app);
		this.settings = settings;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl
			.createEl("p", {
				text: i18next.t("settings.regexReplacing.modal.title.text") ,
			})
			.createEl("p", {
				text: i18next.t("settings.regexReplacing.modal.desc") ,
			})
			.createEl("p", {
				text: i18next.t("settings.regexReplacing.empty")});
		for (const censorText of this.settings.conversion.censorText) {
			const afterIcon = censorText.after ? "arrow-down" : "arrow-up";
			const moment = censorText.after ? i18next.t("common.after").toLowerCase() : i18next.t("common.before").toLowerCase();
			const desc = i18next.t("settings.regexReplacing.momentReplaceRegex", {moment: moment});
			new Setting(contentEl)
				.setClass("github-publisher-censor-entry")
				.addText((text) => {
					text.inputEl.style.width = "100%";
					text.setPlaceholder(i18next.t(
						"regex.entry") 
					)
						.setValue(censorText.entry)
						.onChange(async (value) => {
							censorText.entry = value;
						});
				})
				.addText((text) => {
					text.inputEl.style.width="100%";
					text.setPlaceholder(i18next.t("regex.replace"))
						.setValue(censorText.replace)
						.onChange(async (value) => {
							censorText.replace = value;
						});
                
				})
				
				.addExtraButton((btn) => {
					btn.setIcon("trash")
						.setTooltip(i18next.t("common.delete", {things: "Regex"}))
						.onClick(async () => {
							this.settings.conversion.censorText.splice(
								this.settings.conversion.censorText.indexOf(
									censorText
								),
								1
							);
							this.onOpen();
						});
				})
				.addExtraButton((btn) => {
					btn 
						.setTooltip(desc)
						.setIcon(afterIcon)
						.onClick(async () => {
							censorText.after = !censorText.after;
							this.onOpen();
						});
				});
				
		}
		new Setting(contentEl)
			.addButton((btn) => {
				btn
					.setIcon("plus")
					.setTooltip(i18next.t("common.add", {things: "Regex"}))
					
					.onClick(async () => {
						const censorText: TextCleaner = {
							entry: "",
							replace: "",
							after: false,
						};
						this.settings.conversion.censorText.push(censorText);
						this.onOpen();
					});
			})
			.addButton((button) => {
				button
					.setButtonText(i18next.t("common.save"))
					.onClick(() => {
						this.onSubmit(this.settings);
						this.close();
					});
			});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


