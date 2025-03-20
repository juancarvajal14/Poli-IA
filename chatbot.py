from openai import OpenAI


client = OpenAI(base_url="http://localhost:1234/v1", api_key="deepseek-r1-distill-llama-8b")

def chat_with_deepseek(prompt):
    response = client.chat.completions.create(
        model="lmstudio-community/DeepSeek-R1-Distill-Llama-8B-GGUF",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

while True:
    user_input = input("Tú: ")
    if user_input.lower() in ["salir", "exit"]:
        break
    respuesta = chat_with_deepseek(user_input)
    print("Bot:", respuesta)
