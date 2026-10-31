/** The project taxonomy supplied on 2026-10-26: three directions, sixteen directories.
 * Directory membership is distinct from benchmark availability or measured results. */
// The six core harnesses: the five run on Dev100 in metacase-harbor (Terminus-2 is Harbor's
// reference terminal harness) plus OpenCode. Claude Code runs on the Claude Agent SDK and Codex CLI
// on the OpenAI Agents SDK.
export const HARNESS_NAMES = Object.freeze([
  'DeepSeek Harness', 'DeepAgents', 'Claude Code', 'Codex CLI', 'Terminus-2', 'OpenCode',
]);
// Reasoning effort, lowest to highest; the arena starts every model at XHigh.
export const EFFORTS = Object.freeze(['Low', 'Medium', 'High', 'XHigh']);
export const DEFAULT_EFFORT = 3;
/* The characters are model providers, not model versions: each brings a line-up of models
 * (`variants`, the first is the default) and the loadout picks one and its effort, so a
 * line-up can change without renaming a character. `logo` is the provider's mark on a
 * 0..24 grid, drawn with fill only, using `rule` as the fill rule. OpenAI's blossom and
 * Gemini's star are the standard 24×24 paths; the Claude starburst, the Moonshot crescent,
 * the DeepSeek whale and the Qwen mark come from @lobehub/icons-static-svg (MIT). The marks
 * remain the trademarks of their owners. */
export const MODEL_CHARACTERS = Object.freeze([
  {
    id: 'openai', provider: 'OpenAI', name: 'OpenAI', short: 'OpenAI', badge: 'OPENAI',
    variants: ['GPT-6 Astra', 'GPT-6.1 Sol', 'GPT-5.6 Sol'],
    role: ['Emerald Tactician · OpenAI', '翡翠统帅 · OpenAI'],
    color: '#10a37f', hull: 0x10a37f, limb: 0x0b4f3c, eye: 0xa7f3d0, trim: 0x34d399,
    rule: 'nonzero',
    logo: 'M22.282 9.821a5.985 5.985 0 0 0 -0.516 -4.91 6.046 6.046 0 0 0 -6.51 -2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0 -3.998 2.9 6.046 6.046 0 0 0 0.743 7.097 5.98 5.98 0 0 0 0.51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772 -4.206 5.99 5.99 0 0 0 3.997 -2.9 6.056 6.056 0 0 0 -0.747 -7.073zM13.26 22.43a4.476 4.476 0 0 1 -2.876 -1.04l0.141 -0.081 4.779 -2.758a0.795 0.795 0 0 0 0.392 -0.681v-6.737l2.02 1.168a0.071 0.071 0 0 1 0.038 0.052v5.583a4.504 4.504 0 0 1 -4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1 -0.535 -3.014l0.142 0.085 4.783 2.759a0.771 0.771 0 0 0 0.78 0l5.843 -3.369v2.332a0.08 0.08 0 0 1 -0.033 0.062L9.74 19.95a4.5 4.5 0 0 1 -6.14 -1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366 -1.973V11.6a0.766 0.766 0 0 0 0.388 0.676l5.815 3.355 -2.02 1.168a0.076 0.076 0 0 1 -0.071 0l-4.83 -2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833 -3.387L15.119 7.2a0.076 0.076 0 0 1 0.071 0l4.83 2.791a4.494 4.494 0 0 1 -0.676 8.105v-5.678a0.79 0.79 0 0 0 -0.407 -0.667zm2.01 -3.023l-0.141 -0.085 -4.774 -2.782a0.776 0.776 0 0 0 -0.785 0L9.409 9.23V6.897a0.066 0.066 0 0 1 0.028 -0.061l4.83 -2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02 -1.164a0.08 0.08 0 0 1 -0.038 -0.057V6.075a4.5 4.5 0 0 1 7.375 -3.453l-0.142 0.08L8.704 5.46a0.795 0.795 0 0 0 -0.393 0.681zm1.097 -2.365l2.602 -1.5 2.607 1.5v2.999l-2.597 1.5 -2.607 -1.5z',
  },
  {
    id: 'anthropic', provider: 'Anthropic', name: 'Anthropic', short: 'Anthropic', badge: 'ANTHROPIC',
    variants: ['Claude Opus 5.5', 'Claude Fable 5.1', 'Claude Opus 4.8'],
    role: ['Terracotta Scholar · Anthropic', '赤金学者 · Anthropic'],
    color: '#e07a5f', hull: 0xd97757, limb: 0x6e321f, eye: 0xfde68a, trim: 0xfbbf24,
    rule: 'evenodd',
    logo: 'M4.709 15.955l4.72 -2.647 0.08 -0.23 -0.08 -0.128H9.2l-0.79 -0.048 -2.698 -0.073 -2.339 -0.097 -2.266 -0.122 -0.571 -0.121L0 11.784l0.055 -0.352 0.48 -0.321 0.686 0.06 1.52 0.103 2.278 0.158 1.652 0.097 2.449 0.255h0.389l0.055 -0.157 -0.134 -0.098 -0.103 -0.097 -2.358 -1.596 -2.552 -1.688 -1.336 -0.972 -0.724 -0.491 -0.364 -0.462 -0.158 -1.008 0.656 -0.722 0.881 0.06 0.225 0.061 0.893 0.686 1.908 1.476 2.491 1.833 0.365 0.304 0.145 -0.103 0.019 -0.073 -0.164 -0.274 -1.355 -2.446 -1.446 -2.49 -0.644 -1.032 -0.17 -0.619a2.97 2.97 0 0 1 -0.104 -0.729L6.283 0.134 6.696 0l0.996 0.134 0.42 0.364 0.62 1.414 1.002 2.229 1.555 3.03 0.456 0.898 0.243 0.832 0.091 0.255h0.158V9.01l0.128 -1.706 0.237 -2.095 0.23 -2.695 0.08 -0.76 0.376 -0.91 0.747 -0.492 0.584 0.28 0.48 0.685 -0.067 0.444 -0.286 1.851 -0.559 2.903 -0.364 1.942h0.212l0.243 -0.242 0.985 -1.306 1.652 -2.064 0.73 -0.82 0.85 -0.904 0.547 -0.431h1.033l0.76 1.129 -0.34 1.166 -1.064 1.347 -0.881 1.142 -1.264 1.7 -0.79 1.36 0.073 0.11 0.188 -0.02 2.856 -0.606 1.543 -0.28 1.841 -0.315 0.833 0.388 0.091 0.395 -0.328 0.807 -1.969 0.486 -2.309 0.462 -3.439 0.813 -0.042 0.03 0.049 0.061 1.549 0.146 0.662 0.036h1.622l3.02 0.225 0.79 0.522 0.474 0.638 -0.079 0.485 -1.215 0.62 -1.64 -0.389 -3.829 -0.91 -1.312 -0.329h-0.182v0.11l1.093 1.068 2.006 1.81 2.509 2.33 0.127 0.578 -0.322 0.455 -0.34 -0.049 -2.205 -1.657 -0.851 -0.747 -1.926 -1.62h-0.128v0.17l0.444 0.649 2.345 3.521 0.122 1.08 -0.17 0.353 -0.608 0.213 -0.668 -0.122 -1.374 -1.925 -1.415 -2.167 -1.143 -1.943 -0.14 0.08 -0.674 7.254 -0.316 0.37 -0.729 0.28 -0.607 -0.461 -0.322 -0.747 0.322 -1.476 0.389 -1.924 0.315 -1.53 0.286 -1.9 0.17 -0.632 -0.012 -0.042 -0.14 0.018 -1.434 1.967 -2.18 2.945 -1.726 1.845 -0.414 0.164 -0.717 -0.37 0.067 -0.662 0.401 -0.589 2.388 -3.036 1.44 -1.882 0.93 -1.086 -0.006 -0.158h-0.055L4.132 18.56l-1.13 0.146 -0.487 -0.456 0.061 -0.746 0.231 -0.243 1.908 -1.312 -0.006 0.006z',
  },
  {
    id: 'google', provider: 'Google', name: 'Google', short: 'Google', badge: 'GOOGLE',
    variants: ['Gemini 4 Argon', 'Gemini 3.8 Flash', 'Gemini 3.1 Pro'],
    role: ['Cosmic Twin-Core · Google', '星河双核 · Google'],
    color: '#6366f1', hull: 0x4f46e5, limb: 0x2e1065, eye: 0xe0e7ff, trim: 0xc084fc,
    rule: 'nonzero',
    logo: 'M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0 -6.627 5.373 -12 12 -12 -6.627 0 -12 -5.373 -12 -12z',
  },
  {
    id: 'kimi', provider: 'Kimi', name: 'Kimi', short: 'Kimi', badge: 'KIMI',
    variants: ['Kimi K3', 'Kimi K2.5'],
    role: ['Moonlit Explorer · Moonshot', '月影探索 · Moonshot'],
    color: '#38bdf8', hull: 0x1e3a5f, limb: 0x0f172a, eye: 0x7dd3fc, trim: 0x38bdf8,
    rule: 'evenodd',
    logo: 'M1.052 16.916l9.539 2.552a21.007 21.007 0 0 0 0.06 2.033l5.956 1.593a11.997 11.997 0 0 1 -5.586 0.865l-0.18 -0.016 -0.044 -0.004 -0.084 -0.009 -0.094 -0.01a11.605 11.605 0 0 1 -0.157 -0.02l-0.107 -0.014 -0.11 -0.016a11.962 11.962 0 0 1 -0.32 -0.051l-0.042 -0.008 -0.075 -0.013 -0.107 -0.02 -0.07 -0.015 -0.093 -0.019 -0.075 -0.016 -0.095 -0.02 -0.097 -0.023 -0.094 -0.022 -0.068 -0.017 -0.088 -0.022 -0.09 -0.024 -0.095 -0.025 -0.082 -0.023 -0.109 -0.03 -0.062 -0.02 -0.084 -0.025 -0.093 -0.028 -0.105 -0.034 -0.058 -0.019 -0.08 -0.026 -0.09 -0.031 -0.066 -0.024a6.293 6.293 0 0 1 -0.044 -0.015l-0.068 -0.025 -0.101 -0.037 -0.057 -0.022 -0.08 -0.03 -0.087 -0.035 -0.088 -0.035 -0.079 -0.032 -0.095 -0.04 -0.063 -0.028 -0.063 -0.027a5.655 5.655 0 0 1 -0.041 -0.018l-0.066 -0.03 -0.103 -0.047 -0.052 -0.024 -0.096 -0.046 -0.062 -0.03 -0.084 -0.04 -0.086 -0.044 -0.093 -0.047 -0.052 -0.027 -0.103 -0.055 -0.057 -0.03 -0.058 -0.032a6.49 6.49 0 0 1 -0.046 -0.026l-0.094 -0.053 -0.06 -0.034 -0.051 -0.03 -0.072 -0.041 -0.082 -0.05 -0.093 -0.056 -0.052 -0.032 -0.084 -0.053 -0.061 -0.039 -0.079 -0.05 -0.07 -0.047 -0.053 -0.035a7.785 7.785 0 0 1 -0.054 -0.036l-0.044 -0.03 -0.044 -0.03a6.066 6.066 0 0 1 -0.04 -0.028l-0.057 -0.04 -0.076 -0.054 -0.069 -0.05 -0.074 -0.054 -0.056 -0.042 -0.076 -0.057 -0.076 -0.059 -0.086 -0.067 -0.045 -0.035 -0.064 -0.052 -0.074 -0.06 -0.089 -0.073 -0.046 -0.039 -0.046 -0.039a7.516 7.516 0 0 1 -0.043 -0.037l-0.045 -0.04 -0.061 -0.053 -0.07 -0.062 -0.068 -0.06 -0.062 -0.058 -0.067 -0.062 -0.053 -0.05 -0.088 -0.084a13.28 13.28 0 0 1 -0.099 -0.097l-0.029 -0.028 -0.041 -0.042 -0.069 -0.07 -0.05 -0.051 -0.05 -0.053a6.457 6.457 0 0 1 -0.168 -0.179l-0.08 -0.088 -0.062 -0.07 -0.071 -0.08 -0.042 -0.049 -0.053 -0.062 -0.058 -0.068 -0.046 -0.056a7.175 7.175 0 0 1 -0.027 -0.033l-0.045 -0.055 -0.066 -0.082 -0.041 -0.052 -0.05 -0.064 -0.02 -0.025a11.99 11.99 0 0 1 -1.44 -2.402zm-1.02 -5.794l11.353 3.037a20.468 20.468 0 0 0 -0.469 2.011l10.817 2.894a12.076 12.076 0 0 1 -1.845 2.005L0.657 15.923l-0.016 -0.046 -0.035 -0.104a11.965 11.965 0 0 1 -0.05 -0.153l-0.007 -0.023a11.896 11.896 0 0 1 -0.207 -0.741l-0.03 -0.126 -0.018 -0.08 -0.021 -0.097 -0.018 -0.081 -0.018 -0.09 -0.017 -0.084 -0.018 -0.094c-0.026 -0.141 -0.05 -0.283 -0.071 -0.426l-0.017 -0.118 -0.011 -0.083 -0.013 -0.102a12.01 12.01 0 0 1 -0.019 -0.161l-0.005 -0.047a12.12 12.12 0 0 1 -0.034 -2.145zm1.593 -5.15l11.948 3.196c-0.368 0.605 -0.705 1.231 -1.01 1.875l11.295 3.022c-0.142 0.82 -0.368 1.612 -0.668 2.365l-11.55 -3.09L0.124 10.26l0.015 -0.1 0.008 -0.049 0.01 -0.067 0.015 -0.087 0.018 -0.098c0.026 -0.148 0.056 -0.295 0.088 -0.442l0.028 -0.124 0.02 -0.085 0.024 -0.097c0.022 -0.09 0.045 -0.18 0.07 -0.268l0.028 -0.102 0.023 -0.083 0.03 -0.1 0.025 -0.082 0.03 -0.096 0.026 -0.082 0.031 -0.095a11.896 11.896 0 0 1 1.01 -2.232zm4.442 -4.4L17.352 4.59a20.77 20.77 0 0 0 -1.688 1.721l7.823 2.093c0.267 0.852 0.442 1.744 0.513 2.665L2.106 5.213l0.045 -0.065 0.027 -0.04 0.04 -0.055 0.046 -0.065 0.055 -0.076 0.054 -0.072 0.064 -0.086 0.05 -0.065 0.057 -0.073 0.055 -0.07 0.06 -0.074 0.055 -0.069 0.065 -0.077 0.054 -0.066 0.066 -0.077 0.053 -0.06 0.072 -0.082 0.053 -0.06 0.067 -0.074 0.054 -0.058 0.073 -0.078 0.058 -0.06 0.063 -0.067 0.168 -0.17 0.1 -0.098 0.059 -0.056 0.076 -0.071a12.084 12.084 0 0 1 2.272 -1.677zM12.017 0h0.097l0.082 0.001 0.069 0.001 0.054 0.002 0.068 0.002 0.046 0.001 0.076 0.003 0.047 0.002 0.06 0.003 0.054 0.002 0.087 0.005 0.105 0.007 0.144 0.011 0.088 0.007 0.044 0.004 0.077 0.008 0.082 0.008 0.047 0.005 0.102 0.012 0.05 0.006 0.108 0.014 0.081 0.01 0.042 0.006 0.065 0.01 0.207 0.032 0.07 0.012 0.065 0.011 0.14 0.026 0.092 0.018 0.11 0.022 0.046 0.01 0.075 0.016 0.041 0.01L14.7 0.3l0.042 0.01 0.065 0.015 0.049 0.012 0.071 0.017 0.096 0.024 0.112 0.03 0.113 0.03 0.113 0.032 0.05 0.015 0.07 0.02 0.078 0.024 0.073 0.023 0.05 0.016 0.05 0.016 0.076 0.025 0.099 0.033 0.102 0.036 0.048 0.017 0.064 0.023 0.093 0.034 0.11 0.041 0.116 0.045 0.1 0.04 0.047 0.02 0.06 0.024 0.041 0.018 0.063 0.026 0.04 0.018 0.057 0.025 0.11 0.048 0.1 0.046 0.074 0.035 0.075 0.036 0.06 0.028 0.092 0.046 0.091 0.045 0.102 0.052 0.053 0.028 0.049 0.026 0.046 0.024 0.06 0.033 0.041 0.022 0.052 0.029 0.088 0.05 0.106 0.06 0.087 0.051 0.057 0.034 0.053 0.032 0.096 0.059 0.088 0.055 0.098 0.062 0.036 0.024 0.064 0.041 0.084 0.056 0.04 0.027 0.062 0.042 0.062 0.043 0.023 0.017c0.054 0.037 0.108 0.075 0.161 0.114l0.083 0.06 0.065 0.048 0.056 0.043 0.086 0.065 0.082 0.064 0.04 0.03 0.05 0.041 0.086 0.069 0.079 0.065 0.085 0.071c0.712 0.6 1.353 1.283 1.909 2.031L7.222 0.994l0.062 -0.027 0.065 -0.028 0.081 -0.034 0.086 -0.035c0.113 -0.045 0.227 -0.09 0.341 -0.131l0.096 -0.035 0.093 -0.033 0.084 -0.03 0.096 -0.031c0.087 -0.03 0.176 -0.058 0.264 -0.085l0.091 -0.027 0.086 -0.025 0.102 -0.03 0.085 -0.023 0.1 -0.026L9.04 0.37l0.09 -0.023 0.091 -0.022 0.095 -0.022 0.09 -0.02 0.098 -0.021 0.091 -0.02 0.095 -0.018 0.092 -0.018 0.1 -0.018 0.091 -0.016 0.098 -0.017 0.092 -0.014 0.097 -0.015 0.092 -0.013 0.102 -0.013 0.091 -0.012 0.105 -0.012 0.09 -0.01 0.105 -0.01c0.093 -0.01 0.186 -0.018 0.28 -0.024l0.106 -0.008 0.09 -0.005 0.11 -0.006 0.093 -0.004 0.1 -0.004 0.097 -0.002 0.099 -0.002 0.197 -0.002z',
  },
  {
    id: 'deepseek', provider: 'DeepSeek', name: 'DeepSeek', short: 'DeepSeek', badge: 'DEEPSEEK',
    variants: ['DeepSeek V4.1 Flash', 'DeepSeek V4 Pro', 'DeepSeek R2'],
    role: ['Cobalt Reasoner · DeepSeek', '深海推演 · DeepSeek'],
    color: '#4d6bfe', hull: 0x1d4ed8, limb: 0x172554, eye: 0x67e8f9, trim: 0x06b6d4,
    rule: 'evenodd',
    logo: 'M23.748 4.482c-0.254 -0.124 -0.364 0.113 -0.512 0.234 -0.051 0.039 -0.094 0.09 -0.137 0.136 -0.372 0.397 -0.806 0.657 -1.373 0.626 -0.829 -0.046 -1.537 0.214 -2.163 0.848 -0.133 -0.782 -0.575 -1.248 -1.247 -1.548 -0.352 -0.156 -0.708 -0.311 -0.955 -0.65 -0.172 -0.241 -0.219 -0.51 -0.305 -0.774 -0.055 -0.16 -0.11 -0.323 -0.293 -0.35 -0.2 -0.031 -0.278 0.136 -0.356 0.276 -0.313 0.572 -0.434 1.202 -0.422 1.84 0.027 1.436 0.633 2.58 1.838 3.393 0.137 0.093 0.172 0.187 0.129 0.323 -0.082 0.28 -0.18 0.552 -0.266 0.833 -0.055 0.179 -0.137 0.217 -0.329 0.14a5.526 5.526 0 0 1 -1.736 -1.18c-0.857 -0.828 -1.631 -1.742 -2.597 -2.458a11.365 11.365 0 0 0 -0.689 -0.471c-0.985 -0.957 0.13 -1.743 0.388 -1.836 0.27 -0.098 0.093 -0.432 -0.779 -0.428 -0.872 0.004 -1.67 0.295 -2.687 0.684a3.055 3.055 0 0 1 -0.465 0.137 9.597 9.597 0 0 0 -2.883 -0.102c-1.885 0.21 -3.39 1.102 -4.497 2.623C0.082 8.606 -0.231 10.684 0.152 12.85c0.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482 -0.085 3.133 -0.284 4.994 -1.86 0.47 0.234 0.962 0.327 1.78 0.397 0.63 0.059 1.236 -0.03 1.705 -0.128 0.735 -0.156 0.684 -0.837 0.419 -0.961 -2.155 -1.004 -1.682 -0.595 -2.113 -0.926 1.096 -1.296 2.746 -2.642 3.392 -7.003 0.05 -0.347 0.007 -0.565 0 -0.845 -0.004 -0.17 0.035 -0.237 0.23 -0.256a4.173 4.173 0 0 0 1.545 -0.475c1.396 -0.763 1.96 -2.015 2.093 -3.517 0.02 -0.23 -0.004 -0.467 -0.247 -0.588zM11.581 18c-2.089 -1.642 -3.102 -2.183 -3.52 -2.16 -0.392 0.024 -0.321 0.471 -0.235 0.763 0.09 0.288 0.207 0.486 0.371 0.739 0.114 0.167 0.192 0.416 -0.113 0.603 -0.673 0.416 -1.842 -0.14 -1.897 -0.167 -1.361 -0.802 -2.5 -1.86 -3.301 -3.307 -0.774 -1.393 -1.224 -2.887 -1.298 -4.482 -0.02 -0.386 0.093 -0.522 0.477 -0.592a4.696 4.696 0 0 1 1.529 -0.039c2.132 0.312 3.946 1.265 5.468 2.774 0.868 0.86 1.525 1.887 2.202 2.891 0.72 1.066 1.494 2.082 2.48 2.914 0.348 0.292 0.625 0.514 0.891 0.677 -0.802 0.09 -2.14 0.11 -3.054 -0.614zm1 -6.44a0.306 0.306 0 0 1 0.415 -0.287 0.302 0.302 0 0 1 0.2 0.288 0.306 0.306 0 0 1 -0.31 0.307 0.303 0.303 0 0 1 -0.304 -0.308zm3.11 1.596c-0.2 0.081 -0.399 0.151 -0.59 0.16a1.245 1.245 0 0 1 -0.798 -0.254c-0.274 -0.23 -0.47 -0.358 -0.552 -0.758a1.73 1.73 0 0 1 0.016 -0.588c0.07 -0.327 -0.008 -0.537 -0.239 -0.727 -0.187 -0.156 -0.426 -0.199 -0.688 -0.199a0.559 0.559 0 0 1 -0.254 -0.078c-0.11 -0.054 -0.2 -0.19 -0.114 -0.358 0.028 -0.054 0.16 -0.186 0.192 -0.21 0.356 -0.202 0.767 -0.136 1.146 0.016 0.352 0.144 0.618 0.408 1.001 0.782 0.391 0.451 0.462 0.576 0.685 0.914 0.176 0.265 0.336 0.537 0.445 0.848 0.067 0.195 -0.019 0.354 -0.25 0.452z',
  },
  {
    id: 'qwen', provider: 'Qwen', name: 'Qwen', short: 'Qwen', badge: 'QWEN',
    variants: ['Qwen 3.8 Max', 'Qwen 3.7 Max'],
    role: ['Violet Vanguard · Qwen', '紫晶先锋 · Qwen'],
    color: '#d946ef', hull: 0x9333ea, limb: 0x4a044e, eye: 0xfbcfe8, trim: 0xf43f5e,
    rule: 'evenodd',
    logo: 'M19.713 2.825h-5.907c0 -0.251 -0.066 -0.503 -0.196 -0.728L12.819 0.728A1.46 1.46 0 0 0 11.559 0h-1.58c-0.52 0 -1 0.275 -1.26 0.728l-2.42 4.19a1.45 1.45 0 0 0 0 1.453l0.791 1.37c0.26 0.448 0.74 0.727 1.26 0.727h11.36c0.52 0 1 -0.275 1.26 -0.728l0.79 -1.37a1.45 1.45 0 0 0 0 -1.451l-0.79 -1.37a1.46 1.46 0 0 0 -1.26 -0.728zM0.195 9.905l2.951 5.115a1.46 1.46 0 0 0 -0.531 0.531l-0.791 1.37a1.45 1.45 0 0 0 0 1.452l0.79 1.37c0.26 0.448 0.74 0.727 1.26 0.727h4.84c0.52 0 1 -0.275 1.26 -0.728l0.79 -1.37a1.45 1.45 0 0 0 0 -1.451L5.086 7.083a1.46 1.46 0 0 0 -1.26 -0.728h-1.58c-0.52 0 -1 0.276 -1.26 0.728l-0.79 1.37a1.45 1.45 0 0 0 0 1.452m15.888 13.367 2.951 -5.115c0.217 0.125 0.469 0.196 0.728 0.196h1.582c0.52 0 1 -0.275 1.26 -0.728l0.79 -1.37a1.45 1.45 0 0 0 0 -1.451l-2.42 -4.191a1.46 1.46 0 0 0 -1.259 -0.728h-1.582c-0.52 0 -1 0.276 -1.259 0.728l-5.678 9.838a1.45 1.45 0 0 0 0 1.452l0.79 1.37c0.26 0.448 0.74 0.727 1.26 0.727h1.582c0.52 0 1 -0.275 1.26 -0.728z',
  },
]);
export const ARENA_DOMAINS = Object.freeze([
  {
    id: 'econ', name: ['Economics', '经济'], color: 0x45b5b0,
    summary: ['From empirical evidence to economic understanding.', '从实证证据出发，理解经济运行。'],
    danmaku: [
      ['econ.replication · 100 Dev100 Econometric Replications', 'econ.replication · Dev100 100 篇顶刊计量复现'],
      ['OLS · DID · IV · RDD Coefficient & SE Fidelity', 'OLS · DID · IV · RDD 回归系数与标准误精确核验'],
      ['econ.monetary · FOMC & Central-Bank Stance Analysis', 'econ.monetary · 央行声明与 FOMC 货币政策立场判读'],
      ['econ.markets · Market Signal & Price Movement Calibration', 'econ.markets · 噪声下的市场信号与价格走势预测'],
      ['econ.data · Multi-Source SQL & dbt Data Engineering', 'econ.data · 多源异构商业与经济数据 SQL/dbt 工程'],
      ['econ.statistics · Official Macro Statistics Synthesis', 'econ.statistics · 官方宏观统计跨源检索与结构化合成'],
      ['Harbor Sandbox · Sealed References · Full Trajectory', 'Harbor 容器沙箱 · 隐藏参考答案 · 完整轨迹留存'],
      ['152 Candidate Records · 5 Economics Classes', '152 条经济候选记录 · 5 个二级目录'],
    ],
    entries: [
      { id: 'econ.replication', name: ['Econometric replication', '计量经济复现'], description: ['Clean research data, align empirical specifications and reproduce OLS, DID, IV and RDD coefficients.', '论文清洗、实证设定对齐、OLS/DID/IV/RDD 系数复现。'] },
      { id: 'econ.monetary', name: ['Monetary policy communication', '货币政策沟通'], description: ['Interpret central-bank statements and minutes, interest-rate paths and macroeconomic expectations.', '央行声明与纪要立场判断、利率路径与宏观预期。'] },
      { id: 'econ.markets', name: ['Market forecasting', '市场走势预测'], description: ['Assess price movements under noise, interpret market signals and calibrate against base rates.', '噪声下的价格波动判断、市场信号与基准率校准。'] },
      { id: 'econ.data', name: ['Economic & business data engineering', '经济与商业数据工程'], description: ['Join heterogeneous data sources, align metric definitions and build SQL/dbt transformations.', '多源异构库表关联、指标口径对齐、SQL/dbt 转换。'] },
      { id: 'econ.statistics', name: ['Official statistics synthesis', '官方统计数据综合'], description: ['Retrieve macroeconomic and official statistics, cross-check sources and synthesize structured results.', '宏观与官方统计检索、跨源交叉核对、结构化合成。'] },
    ],
  },
  {
    id: 'fin', name: ['Finance', '金融'], color: 0xf2b545,
    summary: ['Turn financial evidence into accountable decisions.', '让金融证据形成可核验的判断与交付。'],
    danmaku: [
      ['fin.accounting · Month-End Close Word + Excel Deliverables', 'fin.accounting · 集团月结调账与 Word+Excel 双文档交付'],
      ['FIN-T1-003 · 47 Source Records & 27-Item Rubric Judge', 'FIN-T1-003 · 47 份业务凭证交叉核对 + 27 项 Rubric 裁判'],
      ['fin.filings · Long SEC Filings QA & Multi-Step Reasoning', 'fin.filings · SEC 长篇财报跨表勾稽与多步数值推演'],
      ['fin.payments · Payment Reconciliation & Fee Rules', 'fin.payments · 交易流水对账、费率结算与异常排查'],
      ['fin.credit · Borrower Risk Scoring & Fraud Detection', 'fin.credit · 借款人特征评估、信贷审批与反欺诈识别'],
      ['fin.numeric · Valuation, Sensitivity & Table Arithmetic', 'fin.numeric · 财务报表核算、估值与敏感度多步推演'],
      ['fin.nlp · Financial Disclosure Sentiment & Event Extraction', 'fin.nlp · 金融公告语义理解、情绪极性与事件抽取'],
      ['90 Candidate Records · 6 Finance Classes', '90 条金融候选记录 · 6 个二级目录'],
    ],
    entries: [
      { id: 'fin.accounting', name: ['Accounting close & deliverables', '会计结账与财务交付'], description: ['Reconcile ledgers, apply accounting standards, prepare adjustments, reports and workpapers.', '台账核对、准则适用、调账分录、报告与底稿交付。'] },
      { id: 'fin.filings', name: ['Financial filings & research Q&A', '财报与金融研究问答'], description: ['Search long financial filings, reconcile statements and cite multi-step numerical reasoning.', '长篇财报检索、跨表勾稽、多步数值推理与引证。'] },
      { id: 'fin.payments', name: ['Payments & transaction analysis', '支付与交易数据分析'], description: ['Reconcile transactions, apply fee and settlement rules, investigate anomalies and aggregate data.', '交易流水对账、费率与结算规则、异常排查与聚合。'] },
      { id: 'fin.credit', name: ['Credit risk & fraud detection', '信用风险与欺诈识别'], description: ['Assess borrower and transaction features, judge default risk and detect fraud.', '借款人与交易特征评估、违约判断、欺诈检测。'] },
      { id: 'fin.numeric', name: ['Financial numerical reasoning', '金融数值推理'], description: ['Calculate financial statements, valuations and sensitivities with multi-step quantitative reasoning.', '财务报表核算、估值与敏感度计算、多步量化推演。'] },
      { id: 'fin.nlp', name: ['Financial language understanding', '金融文本理解'], description: ['Understand financial announcements, classify sentiment and extract events.', '金融公告语义理解、情绪极性判断与事件抽取。'] },
    ],
  },
  {
    id: 'soc', name: ['Social Science', '社科'], color: 0x7d6ad8,
    summary: ['Understand people, institutions and the decisions between them.', '理解个体、组织与制度，形成有依据的决策。'],
    danmaku: [
      ['soc.law · LawBench Statute Recall & Legal Reasoning', 'soc.law · LawBench 法条适用、合规边界与案例裁量'],
      ['soc.hr · HR-T3-114 Training & Procurement Workbook', 'soc.hr · HR-T3-114 培训成效评估与采购验收决策底稿'],
      ['soc.business · CRM Lifecycle & Operations Analytics', 'soc.business · CRM 客户生命周期与商业运营指标分析'],
      ['soc.society · Survey, Demographic & Education Data', 'soc.society · 社会调查、人口与教育异构表聚合分析'],
      ['soc.psychology · Behavioral & Cognitive Experiment Analysis', 'soc.psychology · 行为与认知实验统计检验与科学计算'],
      ['Word Decision Memo + Excel Evidence Workbook', 'Word 决策备忘录 + Excel 证据溯源底稿'],
      ['Deterministic Verifiers + Multi-Dimensional Rubrics', '确定性代码核验 + 多维业务 Rubric 细粒度归因'],
      ['43 Candidate Records · 5 Social Science Classes', '43 条社科候选记录 · 5 个二级目录'],
    ],
    entries: [
      { id: 'soc.law', name: ['Law & regulation', '法律与监管'], description: ['Apply legal provisions, review compliance boundaries and reason over cases and judgments.', '法条适用、合规边界审查、法律推理与案例裁量。'] },
      { id: 'soc.hr', name: ['People & organizational analysis', '人力资源与组织分析'], description: ['Diagnose organizations, calculate compensation and performance, schedule work and propose policies.', '组织诊断、薪酬绩效核算、工时排程与制度建议。'] },
      { id: 'soc.business', name: ['Business operations & CRM', '商业运营与客户管理'], description: ['Analyze business processes, manage customer lifecycles and interpret CRM operating metrics.', '业务流程分析、客户生命周期管理、CRM 运营指标。'] },
      { id: 'soc.society', name: ['Society, education & survey data', '社会、教育与调查数据'], description: ['Interpret survey, population and education data and aggregate heterogeneous tables.', '社会调查与人口教育数据语义理解、异构表聚合。'] },
      { id: 'soc.psychology', name: ['Psychology & cognitive science', '心理与认知科学'], description: ['Analyze behavioral and cognitive experiments, perform statistical tests and scientific computing.', '行为与认知实验数据分析、统计检验与科学计算。'] },
    ],
  },
]);
