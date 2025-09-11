import { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelInfoView } from "../common/ModelInfoView"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"



/**
 * Props for the PuterProvider component
 */
interface PuterProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}



/**
 * The Puter.js provider configuration component
 * Puter.js provides free AI models without API keys - users pay for their own usage
 */
export const PuterProvider = ({ showModelOptions, isPopup, currentMode }: PuterProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()



	// Get the normalized configuration
	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)



	// List of available Puter.js models
	const puterModels = [
		"gpt-4o-mini",
		"gpt-4o",
		"o1",
		"o1-mini",
		"o1-pro",
		"o3",
		"o3-mini",
		"o4-mini",
		"gpt-4.1",
		"gpt-4.1-mini",
		"gpt-4.1-nano",
		"gpt-4.5-preview",
		"claude-sonnet-4",
		"claude-opus-4",
		"claude-3-7-sonnet",
		"claude-3-5-sonnet",
		"deepseek-chat",
		"deepseek-reasoner",
		"google/gemini-2.5-flash-preview",
		"google/gemini-2.5-flash-preview:thinking",
		"google/gemini-2.0-flash-lite-001",
		"google/gemini-2.0-flash-001",
		"google/gemini-pro-1.5",
		"meta-llama/llama-4-maverick",
		"meta-llama/llama-4-scout",
		"meta-llama/llama-3.3-70b-instruct",
		"meta-llama/llama-3.2-3b-instruct",
		"meta-llama/llama-3.2-1b-instruct",
		"meta-llama/llama-3.1-8b-instruct",
		"meta-llama/llama-3.1-405b-instruct",
		"meta-llama/llama-3.1-70b-instruct",
		"meta-llama/llama-3-70b-instruct",
		"mistral-large-latest",
		"codestral-latest",
		"google/gemma-2-27b-it",
		"grok-beta",
	]



	return (
		<div>
			{/* Model Selection Dropdown */}
			<div style={{ marginBottom: 10 }}>
				<label htmlFor="puter-model" style={{ fontWeight: 500 }}>
					AI Model
				</label>
				<VSCodeDropdown
					id="puter-model"
					onChange={(e: any) =>
						handleModeFieldChange(
							{ plan: "planModeApiModelId", act: "actModeApiModelId" },
							e.target.value,
							currentMode,
						)
					}
					style={{ width: "100%" }}
					value={selectedModelId || ""}>
					<VSCodeOption value="">Select a model...</VSCodeOption>
					{puterModels.map((model) => (
						<VSCodeOption key={model} value={model}>
							{model}
						</VSCodeOption>
					))}
				</VSCodeDropdown>
			</div>



			{/* Provider Description */}
			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					color: "var(--vscode-descriptionForeground)",
				}}>
				Puter.js provides access to multiple AI models without requiring API keys. Users pay only for their own AI usage
				through their Puter account.
				<span style={{ color: "var(--vscode-successForeground)", fontWeight: 500 }}>No subscription required!</span>
			</p>



			{/* Link to Puter documentation */}
			<p
				onClick={() => window.open("https://docs.puter.com", "_blank")}
				style={{
					fontSize: "11px",
					marginTop: 5,
					color: "var(--vscode-textLinkForeground)",
					cursor: "pointer",
					textDecoration: "underline",
				}}>
				Learn more about Puter.js →
			</p>



			{/* Credits/Powered by link as requested */}
			<p
				style={{
					fontSize: "10px",
					marginTop: 5,
					color: "var(--vscode-descriptionForeground)",
					textAlign: "center",
				}}>
				Powered by{" "}
				<a
					href="https://developer.puter.com"
					rel="noopener"
					style={{
						color: "var(--vscode-textLinkForeground)",
						textDecoration: "underline",
					}}
					target="_blank">
					Puter
				</a>
			</p>



			{showModelOptions && (
				<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
			)}
		</div>
	)
}



