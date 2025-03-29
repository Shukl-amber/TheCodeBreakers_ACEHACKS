import React from 'react';
import {
  BarChart3,
  Brain,
  Building2,
  ChevronRight,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  Globe2,
  LineChart,
  Lock,
  MessageSquare,
  Package,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-sm z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Shop-AI-lyze</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900">Benefits</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6">
              Intelligent Inventory Management
              <span className="block text-gray-900">for the AI Era</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Harness the power of artificial intelligence to revolutionize your inventory management. 
              Predict trends, automate operations, and boost profitability with enterprise-grade analytics.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center">
                Start Free Trial <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
            <div className="mt-12 flex justify-center space-x-8">
              <img src="https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=100&q=80" alt="Trust Badge" className="h-12 opacity-50 hover:opacity-75 transition" />
              <img src="https://images.unsplash.com/photo-1631700611307-37dbcb89ef7e?auto=format&fit=crop&w=100&q=80" alt="Security Badge" className="h-12 opacity-50 hover:opacity-75 transition" />
              <img src="https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?auto=format&fit=crop&w=100&q=80" alt="Award Badge" className="h-12 opacity-50 hover:opacity-75 transition" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Powerful Features for Modern Business</h2>
            <p className="text-xl text-gray-600">Everything you need to manage inventory intelligently</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="h-8 w-8 text-indigo-600" />,
                title: "Advanced AI Predictions",
                description: "Our neural networks analyze years of data to predict seasonal trends, demand spikes, and optimal stock levels with 95% accuracy."
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-indigo-600" />,
                title: "Real-time Analytics Dashboard",
                description: "Interactive visualizations and KPIs provide instant insights into inventory health, sales velocity, and profit margins."
              },
              {
                icon: <Rocket className="h-8 w-8 text-indigo-600" />,
                title: "Automated Ordering",
                description: "Set up smart reorder points and let our system handle inventory replenishment."
              },
              {
                icon: <Globe2 className="h-8 w-8 text-indigo-600" />,
                title: "Omnichannel Integration",
                description: "Seamlessly sync inventory across e-commerce, retail POS, and marketplace channels in real-time."
              },
              {
                icon: <Sparkles className="h-8 w-8 text-indigo-600" />,
                title: "Intelligent Optimization",
                description: "AI algorithms continuously optimize your stock levels, reduce carrying costs, and prevent stockouts automatically."
              },
              {
                icon: <Database className="h-8 w-8 text-indigo-600" />,
                title: "Smart Report Distribution",
                description: "Automated daily, weekly, and monthly reports delivered to stakeholders with customized insights for each department."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl border hover:border-indigo-600 transition">
                <div className="bg-indigo-50 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-gray-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Real Results for Real Businesses</h2>
            <p className="text-xl text-gray-600">See how Shop-AI-lyze transforms operations</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Clock className="h-8 w-8 text-indigo-600" />,
                title: "Save 20+ Hours Weekly",
                description: "Eliminate manual data entry, report generation, and inventory counts with smart automation."
              },
              {
                icon: <DollarSign className="h-8 w-8 text-indigo-600" />,
                title: "Increase Profits by Massively",
                description: "Our clients average 15% profit increase through optimized stock levels and reduced waste."
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-indigo-600" />,
                title: "100% Order Accuracy",
                description: "AI-powered order management virtually eliminates human error and stockouts."
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-sm">
                <div className="bg-indigo-50 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted by Business Leaders</h2>
            <p className="text-xl text-gray-600">See what our customers have to say</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Mushan Khan",
                role: "Retail Store Owner",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
                quote: "Shop-AI-lyze has transformed how we manage inventory. We've reduced stockouts by 85% and saved countless hours on manual tasks."
              },
              {
                name: "Mohammed Adnan ",
                role: "E-commerce Director",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
                quote: "The AI predictions are incredibly accurate. We've optimized our inventory across multiple channels and increased our profit margins significantly."
              },
              {
                name: "Netal Sarda",
                role: "Operations Manager",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
                quote: "The automated ordering system is a game-changer. We never worry about running out of stock or over-ordering anymore."
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-xl border">
                <img src={testimonial.image} alt={testimonial.name} className="w-16 h-16 rounded-full mb-6" />
                <p className="text-gray-600 mb-6">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that's right for your business</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "5",
                description: "Perfect for small businesses",
                features: [
                  "Up to 5,000 SKUs",
                  "Basic AI predictions",
                  "Weekly email reports",
                  "Email support",
                  "3 team members",
                  "Basic analytics"
                ]
              },
              {
                name: "Professional",
                price: "15",
                description: "For growing businesses",
                features: [
                  "Up to 50,000 SKUs",
                  "Advanced AI predictions",
                  "Daily automated reports",
                  "Priority support",
                  "10 team members",
                  "Advanced analytics",
                  "Custom dashboards",
                  "API access"
                ]
              },
              {
                name: "Enterprise",
                price: "50",
                description: "For large operations",
                features: [
                  "Unlimited SKUs",
                  "Custom AI models",
                  "Real-time reporting",
                  "24/7 priority support",
                  "Unlimited team members",
                  "Enterprise analytics",
                  "Custom integrations",
                  "Dedicated account manager",
                  "On-premise deployment"
                ]
              }
            ].map((plan, index) => (
              <div key={index} className={`bg-white p-8 rounded-xl border ${index === 1 ? 'border-indigo-600 ring-2 ring-indigo-600' : ''}`}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <ChevronRight className="h-5 w-5 text-indigo-600 mr-2" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-semibold ${
                  index === 1
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border-2 border-gray-300 text-gray-700 hover:border-indigo-600 hover:text-indigo-600'
                } transition`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl py-16 px-8 md:px-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Inventory Management?</h2>
            <p className="text-xl text-indigo-100 mb-8">Join over 10,000 businesses using Shop-AI-lyze to optimize their operations</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition">
                Start Free Trial
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-6">
                <Store className="h-8 w-8 text-indigo-400" />
                <span className="ml-2 text-xl font-bold">Shop-AI-lyze</span>
              </div>
              <p className="text-gray-400">AI-powered inventory management for modern business</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2025 Shop-AI-lyze. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white">
                <Package className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <MessageSquare className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Building2 className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Fixed Elements */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-4">
        <button className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition">
          <MessageSquare className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default App;