// src/components/apikeys/CodeExamples.tsx
import { useState } from 'react';

type CodeLanguage = 'javascript' | 'python' | 'curl';

const CHAT_MODELS = [
    "us.amazon.nova-lite-v1:0",
    "us.amazon.nova-micro-v1:0",
    "us.amazon.nova-pro-v1:0",
    "anthropic.claude-v2:1",
    "anthropic.claude-v2",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-instant-v1",
    "meta.llama3-8b-instruct-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "meta.llama3-1-70b-instruct-v1:0",
    "meta.llama3-1-405b-instruct-v1:0",
    "us.meta.llama3-2-1b-instruct-v1:0",
    "us.meta.llama3-2-3b-instruct-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-3-70b-instruct-v1:0",
    "deepseek-llm-r1-distill-llama-70b",
    "deepseek-llm-r1-distill-qwen-32b",
    "deepseek-llm-r1-distill-llama-8b"
];

interface CodeExample {
    id: CodeLanguage;
    label: string;
    code: string;
}

const getExampleCode = (language: CodeLanguage) => {
    const modelList = CHAT_MODELS.map(model => `    "${model}"`).join(',\n');
    
    const examples = {
        javascript: `// Available models:
const MODELS = [
${modelList}
];

const response = await fetch('https://api.llmchats.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
        model: "anthropic.claude-v2", // Choose from available models
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello!" }
        ]
    })
});

const data = await response.json();
console.log(data.choices[0].message);`,

        python: `# Available models
MODELS = [
${modelList}
]

import requests

response = requests.post(
    'https://api.llmchats.com/v1/chat/completions',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'model': 'anthropic.claude-v2',  # Choose from available models
        'messages': [
            {'role': 'system', 'content': 'You are a helpful assistant.'},
            {'role': 'user', 'content': 'Hello!'}
        ]
    }
)

print(response.json()['choices'][0]['message'])`,

        curl: `# Available models:
# ${CHAT_MODELS.join('\n# ')}

curl https://api.llmchats.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "anthropic.claude-v2",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'`
    };

    return examples[language];
};

const CODE_EXAMPLES: CodeExample[] = [
    {
        id: 'javascript',
        label: 'JavaScript',
        code: getExampleCode('javascript')
    },
    {
        id: 'python',
        label: 'Python',
        code: getExampleCode('python')
    },
    {
        id: 'curl',
        label: 'cURL',
        code: getExampleCode('curl')
    }
];

export function CodeExamples() {
    const [activeTab, setActiveTab] = useState<CodeLanguage>('javascript');

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
    };

    return (
        <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Sample Code</h2>
                <p className="mt-2 text-gray-600">Here's how to use your API key with our service:</p>
            </div>
            
            {/* Language Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                    {CODE_EXAMPLES.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                px-6 py-3 border-b-2 text-sm font-medium
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Code Examples */}
            <div className="p-6">
                <div className="relative">
                    <button 
                        className="absolute right-4 top-4 text-blue-600 hover:text-blue-800 text-sm"
                        onClick={() => handleCopyCode(CODE_EXAMPLES.find(ex => ex.id === activeTab)?.code || '')}
                    >
                        Copy code
                    </button>
                    <pre className="text-sm overflow-x-auto bg-gray-800 text-white p-4 rounded">
                        <code>{CODE_EXAMPLES.find(ex => ex.id === activeTab)?.code}</code>
                    </pre>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800">Note</h3>
                    <p className="mt-1 text-sm text-blue-600">
                        Replace 'YOUR_API_KEY' with your actual API key. Keep your API key secure and never share it publicly.
                        Select an appropriate model from the available models list.
                    </p>
                </div>
            </div>
        </div>
    );
}