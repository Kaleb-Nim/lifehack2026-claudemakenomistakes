# Q&A

## Why would merchants upload their products into a shared catalogue instead of using an agent specialised to their own catalogue?

A merchant-specific agent only serves consumers who have already chosen that merchant. The shared catalogue exposes merchants to undecided shoppers, creating a new customer-acquisition channel while merchants retain control of their products and checkout.

## Why build a shared catalogue instead of letting merchants deploy their own catalogues or APIs on our agent framework?

Our goal is to create value for both sides: merchants gain exposure through the agent, while consumers can discover and compare products from multiple merchants in one conversation instead of shopping with only one merchant. Separate agents improve individual stores, but the shared catalogue solves discovery across stores.

## How is the agent category-trained?

Each agent uses a pre-built category intelligence pack that defines its product taxonomy, extraction schema, merchant and shopper clarification questions, comparison logic, ranking rules, and safeguards. For laptops, the pack understands fields such as processor, RAM, weight, battery life, GPU, warranty, upgradeability, and accessory compatibility. It uses those fields to resolve missing or conflicting merchant data, ask questions that materially change a recommendation, compare products consistently across merchants, and explain category-specific trade-offs. Merchants only select a category and upload their catalogue; they do not configure prompts or train a model. The current prototype implements this specialization through category-specific schemas, rules, and prompting rather than a fine-tuned foundation model.

## How does product discovery and reranking work?

The agent first turns the shopper's request into structured hard constraints, such as category, budget, and availability, plus softer preferences such as portability or battery life. It retrieves a broad candidate set using lexical search for exact terms, semantic search for meaning, and graph relationships for catalogue context such as merchants, outlets, stock, and compatible products. The system fuses those ranked lists, removes products that violate hard constraints, and reranks the remaining candidates by preference fit, value, listing quality, and availability. It then diversifies the final selection across meaningful products and merchants, returning catalogue images, matched attributes, trade-offs, and an explanation for each recommendation.

## How are transactions secured through the Telegram Mini App and VIC?

When the user adds their Visa card to VIC, VIC verifies the cardholder, provisions an agent-specific payment token, and creates a Visa Payment Passkey for future approvals. At checkout, the Telegram Mini App shows the exact merchant, items, and total; our backend validates the Telegram user and sends that one-time payment instruction to VIC. The user approves it with their Visa Payment Passkey, and VIC checks that the payment matches the authorized merchant and amount before Visa processes it. Card details never enter the AI, and Telegram biometrics alone do not authorize the payment.
